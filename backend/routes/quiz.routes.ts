import { Router, Request, Response } from 'express';
import { AIService } from '../services/AIService';
import { DatabaseService } from '../services/DatabaseService';
import { VectorStoreService, MemoryChunk } from '../services/VectorStoreService';

export const createQuizRouter = (
    aiService: AIService,
    dbService: DatabaseService,
    vectorStoreService: VectorStoreService
) => {
    const router = Router();

    router.post('/', async (req: Request, res: Response): Promise<any> => {
        const startTime = Date.now();
        try {
            if (vectorStoreService.count === 0) {
                return res.status(400).json({ error: 'Chưa có tài liệu nào được nạp. Vui lòng upload PDF trước.' });
            }

            const chunks = vectorStoreService.getChunks();
            const step = Math.max(1, Math.floor(chunks.length / 4));
            const sampleChunks: MemoryChunk[] = [];
            for (let i = 0; i < chunks.length && sampleChunks.length < 4; i += step) {
                sampleChunks.push(chunks[i]);
            }

            const context = sampleChunks.map((item, idx) => `[Đoạn ${idx + 1}]: ${item.content}`).join('\n\n');
            const quizData = await aiService.generateQuiz(context);

            const latency = Date.now() - startTime;
            dbService.logAIRequest('/api/quiz', 'Tạo đề trắc nghiệm', latency, 600, 0.00005, 'SUCCESS');

            return res.status(200).json({
                message: "Tạo bài trắc nghiệm thành công!",
                quiz: quizData
            });
        } catch (error) {
            console.error("Lỗi API Quiz:", error);
            const latency = Date.now() - startTime;
            dbService.logAIRequest('/api/quiz', 'Tạo đề trắc nghiệm', latency, 0, 0, 'ERROR');
            return res.status(500).json({ error: 'Không thể tạo bài trắc nghiệm. Vui lòng thử lại.' });
        }
    });

    return router;
};