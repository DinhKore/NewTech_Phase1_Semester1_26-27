import { Router, Request, Response } from 'express';
import { AIService } from '../services/AIService';
import { DatabaseService } from '../services/DatabaseService';
import { VectorStoreService } from '../services/VectorStoreService';

export const createChatRouter = (
    aiService: AIService,
    dbService: DatabaseService,
    vectorStoreService: VectorStoreService
) => {
    const router = Router();

    // 1. LẤY DANH SÁCH CÁC PHIÊN CHAT (SỬA LỖI MẤT API)
    router.get('/sessions', (req: Request, res: Response): any => {
        try {
            const sessions = dbService.getChatSessions();
            return res.status(200).json({ sessions });
        } catch (err) {
            return res.status(500).json({ error: 'Lỗi lấy danh sách phiên chat' });
        }
    });

    // 2. TẠO PHIÊN CHAT MỚI (SỬA LỖI MẤT API)
    router.post('/sessions', (req: Request, res: Response): any => {
        try {
            const sessionId = 'session_' + Date.now();
            dbService.createChatSession(sessionId, 'Đoạn chat mới');
            return res.status(200).json({ sessionId, title: 'Đoạn chat mới' });
        } catch (err) {
            return res.status(500).json({ error: 'Lỗi tạo phiên chat mới' });
        }
    });

    // 3. LẤY LỊCH SỬ TIN NHẮN CỦA 1 PHIÊN
    router.get('/sessions/:id/messages', (req: Request, res: Response): any => {
        try {
            const id = String(req.params.id);
            const messages = dbService.getSessionMessages(id);
            return res.status(200).json({ messages });
        } catch (err) {
            return res.status(500).json({ error: 'Lỗi lấy tin nhắn của phiên chat' });
        }
    });

    // 4. XÓA PHIÊN CHAT
    router.delete('/sessions/:id', (req: Request, res: Response): any => {
        try {
            const id = String(req.params.id);
            dbService.deleteChatSession(id);
            return res.status(200).json({ message: 'Đã xóa phiên chat thành công!' });
        } catch (err) {
            return res.status(500).json({ error: 'Lỗi xóa phiên chat' });
        }
    });

    // 5. LUỒNG CHAT RAG STREAMING (SSE)
    router.post('/', async (req: Request, res: Response): Promise<any> => {
        const startTime = Date.now();
        const { question, sessionId = 'default_session' } = req.body;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        try {
            if (!question || vectorStoreService.count === 0) {
                res.write(`data: ${JSON.stringify({ type: 'error', message: 'Dữ liệu không hợp lệ hoặc chưa nạp tài liệu.' })}\n\n`);
                return res.end();
            }

            const chatData = await aiService.processChatStream(question, vectorStoreService);

            if (chatData.isRefused) {
                const validSessionId = String(sessionId);
                dbService.saveMessageToSession(validSessionId, 'user', question, []);
                dbService.saveMessageToSession(
                    validSessionId,
                    'ai',
                    chatData.defaultAnswer ?? "Tôi không tìm thấy thông tin này trong tài liệu của bạn.",
                    []
                );
                dbService.logAIRequest('/api/chat', question, Date.now() - startTime, 50, 0.00002, 'REFUSED');

                res.write(`data: ${JSON.stringify({ type: 'sources', sources: [] })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: 'chunk', text: chatData.defaultAnswer })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                return res.end();
            }

            res.write(`data: ${JSON.stringify({ type: 'sources', sources: chatData.sourcesInfo })}\n\n`);

            let fullAnswer = "";
            for await (const chunk of chatData.stream) {
                const chunkText = chunk.text();
                fullAnswer += chunkText;
                res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
            }

            try {
                const validSessionId = String(sessionId);
                dbService.saveMessageToSession(validSessionId, 'user', question, []);
                dbService.saveMessageToSession(validSessionId, 'ai', fullAnswer, chatData.sourcesInfo);

                const latency = Date.now() - startTime;
                const promptLen = chatData.promptLength ?? 0;
                const approxTokens = Math.round((promptLen + fullAnswer.length) / 4);
                const cost = Number(((approxTokens / 1000) * 0.000075).toFixed(6));
                dbService.logAIRequest('/api/chat', question, latency, approxTokens, cost, 'SUCCESS');
            } catch (dbErr) {
                console.error("Cảnh báo lỗi lưu DB:", dbErr);
            }

            res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
            res.end();
        } catch (error) {
            dbService.logAIRequest('/api/chat', question || '', Date.now() - startTime, 0, 0, 'ERROR');
            if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ type: 'error', message: 'Hệ thống AI đang bảo trì.' })}\n\n`);
                res.end();
            }
        }
    });

    return router;
};