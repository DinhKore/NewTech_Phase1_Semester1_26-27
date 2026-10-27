import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// Import các Class dịch vụ OOP
import { DatabaseService } from './services/DatabaseService';
import { VectorStoreService, MemoryChunk } from './services/VectorStoreService';
import { AIService } from './services/AIService';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Khởi tạo các Instance (Đối tượng OOP)
const dbService = new DatabaseService('course_assistant.db');
const vectorStoreService = new VectorStoreService();
const aiService = new AIService(process.env.GEMINI_API_KEY as string);

// Phục hồi dữ liệu từ SQLite vào RAM khi khởi động
const savedChunks = dbService.getAllChunks();
if (savedChunks.length > 0) {
    vectorStoreService.setChunks(savedChunks);
    console.log(`🔄 [OOP System] Đã phục hồi ${vectorStoreService.count} đoạn Vector từ SQLite lên RAM!`);
}

// Cấu hình Multer upload giới hạn 5MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ==========================================
// 1. API UPLOAD TÀI LIỆU
// ==========================================
app.post('/api/upload', upload.single('document'), async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Vui lòng đính kèm file hợp lệ.' });

        console.log("Đang đọc và băm file PDF...");
        const fileArrayBuffer = new Uint8Array(req.file.buffer);
        const blob = new Blob([fileArrayBuffer], { type: 'application/pdf' });
        const loader = new PDFLoader(blob);
        const rawDocs = await loader.load();

        const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
        const docs = await textSplitter.splitDocuments(rawDocs);
        console.log(`Đã băm thành ${docs.length} đoạn. Đang tạo Vector...`);

        // Vector hóa dữ liệu
        const newChunks: MemoryChunk[] = [];
        for (const doc of docs) {
            const vector = await aiService.getEmbedding(doc.pageContent);
            newChunks.push({ content: doc.pageContent, vector });
        }

        // Lưu vào SQLite qua DatabaseService
        const docId = dbService.saveDocument(req.file.originalname, docs.length);
        dbService.saveChunks(docId, newChunks);

        // Cập nhật RAM qua VectorStoreService
        vectorStoreService.setChunks(newChunks);

        console.log(`💾 [OOP System] Đã lưu ${newChunks.length} chunks vào SQLite và cập nhật RAM!`);

        return res.status(200).json({
            message: 'Vector hóa thành công!',
            chunksCount: docs.length,
            fileName: req.file.originalname
        });
    } catch (error) {
        console.error("Lỗi RAG Upload:", error);
        return res.status(500).json({ error: 'Lỗi server khi xử lý file PDF' });
    }
});

// ==========================================
// 2. API CHAT RAG
// ==========================================
app.post('/api/chat', async (req: Request, res: Response): Promise<any> => {
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ error: 'Vui lòng nhập câu hỏi.' });
        if (vectorStoreService.count === 0) {
            return res.status(400).json({ error: 'Chưa có tài liệu nào được nạp. Vui lòng upload PDF trước.' });
        }

        // 1. Vector hóa câu hỏi
        const questionVector = await aiService.getEmbedding(question);

        // 2. Lấy Top 3 đoạn sát nhất qua VectorStoreService
        const top3Docs = vectorStoreService.findTopK(questionVector, 3);

        // 3. Guardrail Cosine threshold 0.45
        if (top3Docs.length === 0 || top3Docs[0].score < 0.45) {
            const defaultAnswer = "Tôi không tìm thấy thông tin này trong tài liệu của bạn.";
            dbService.saveChat(question, defaultAnswer, []);
            return res.status(200).json({ answer: defaultAnswer, confidence: "0%" });
        }

        let context = "";
        const sourcesInfo: any[] = [];
        top3Docs.forEach((item, index) => {
            const similarityScore = (item.score * 100).toFixed(1);
            context += `[Trích đoạn ${index + 1}]:\n${item.content}\n\n`;
            sourcesInfo.push({
                id: index + 1,
                score: `${similarityScore}%`,
                snippet: item.content.substring(0, 50) + "..."
            });
        });

        const prompt = `Bạn là Trợ lý AI thông minh. Dựa vào tài liệu dưới đây để trả lời câu hỏi:
- CHỈ trả lời dựa trên thông tin có trong tài liệu.
- Nếu không có manh mối, hãy đáp: "Tôi không tìm thấy thông tin này trong tài liệu của bạn."

TÀI LIỆU CUNG CẤP:
${context}

CÂU HỎI: ${question}`;

        const answer = await aiService.generateContentWithRetry(prompt);
        dbService.saveChat(question, answer, sourcesInfo);

        return res.status(200).json({ answer, sources: sourcesInfo });
    } catch (error) {
        console.error("Lỗi Chat RAG:", error);
        return res.status(500).json({ error: 'Hệ thống AI đang bảo trì hoặc quá tải.' });
    }
});

// ==========================================
// 3. API TẠO TRẮC NGHIỆM (QUIZ)
// ==========================================
app.post('/api/quiz', async (req: Request, res: Response): Promise<any> => {
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

        return res.status(200).json({ message: "Tạo bài trắc nghiệm thành công!", quiz: quizData });
    } catch (error) {
        console.error("Lỗi Quiz:", error);
        return res.status(500).json({ error: 'Không thể tạo bài trắc nghiệm. Vui lòng thử lại.' });
    }
});

// ==========================================
// 4. API LẤY DANH SÁCH & LỊCH SỬ TỪ SQLITE
// ==========================================
app.get('/api/documents', (req: Request, res: Response): any => {
    return res.status(200).json({ documents: dbService.getDocuments() });
});

app.get('/api/history/chat', (req: Request, res: Response): any => {
    return res.status(200).json({ history: dbService.getChatHistory() });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 [OOP Architecture] Backend đang chạy tại http://localhost:${PORT}`);
});