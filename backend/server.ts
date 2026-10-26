import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/core/vectorstores";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Guardrail: Chặn file > 5MB chống sập RAM
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Biến toàn cục lưu Vector Database tạm trên RAM (Bypass lỗi Chroma)
export let globalVectorStore: MemoryVectorStore | null = null;

// Cấu hình AI
const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "text-embedding-004",
});

const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-1.5-flash",
    temperature: 0, // AI trả lời nghiêm túc, bám sát tài liệu
});

// ==========================================
// 1. API UPLOAD FILE & VECTOR HÓA
// ==========================================
app.post('/api/upload', upload.single('document'), async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Vui lòng đính kèm file hợp lệ.' });
        if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'Thiếu API KEY.' });

        console.log("Đang đọc và băm file PDF...");
        const fileArrayBuffer = new Uint8Array(req.file.buffer);
        const blob = new Blob([fileArrayBuffer], { type: 'application/pdf' });
        const loader = new PDFLoader(blob);
        const rawDocs = await loader.load();

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const docs = await textSplitter.splitDocuments(rawDocs);

        console.log(`Đã băm thành ${docs.length} đoạn. Đang lưu vào RAM (MemoryVectorStore)...`);
        // Nạp Vector vào RAM
        globalVectorStore = new MemoryVectorStore(embeddings);
        await globalVectorStore.addDocuments(docs);
        console.log("Hoàn tất!");
        return res.status(200).json({
            message: 'Vector hóa thành công!',
            chunksCount: docs.length,
            fileName: req.file.originalname
        });

    } catch (error) {
        console.error("Lỗi hệ thống RAG:", error);
        return res.status(500).json({ error: 'Lỗi server khi xử lý file PDF' });
    }
});

// ==========================================
// 2. API CHAT RAG (Có Guardrails & Tính Cosin)
// ==========================================
app.post('/api/chat', async (req: Request, res: Response): Promise<any> => {
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ error: 'Vui lòng nhập câu hỏi.' });

        // Rào chắn (Guardrail): Bắt lỗi chưa upload file
        if (!globalVectorStore) {
            return res.status(400).json({
                error: 'Chưa có tài liệu nào được nạp. Vui lòng upload PDF trước.'
            });
        }

        console.log(`Nhận câu hỏi: "${question}"`);

        // Quét Vector trên RAM lấy Top 3
        const results = await globalVectorStore.similaritySearchWithScore(question, 3);

        // Xử lý khi không tìm thấy dữ liệu liên quan
        if (results.length === 0) {
            return res.status(200).json({ answer: "Xin lỗi, không tìm thấy dữ liệu liên quan.", confidence: "0%" });
        }

        let context = "";
        const sourcesInfo: any[] = [];

        // Tính toán điểm Cosin cho UI
        results.forEach((result: any, index: any) => {
            const doc = result[0];
            const similarity = result[1]; // Điểm tương đồng từ MemoryVectorStore

            const similarityScore = (similarity * 100).toFixed(1);
            context += `[Trích đoạn ${index + 1}]:\n${doc.pageContent}\n\n`;
            sourcesInfo.push({
                id: index + 1,
                score: `${similarityScore}%`,
                snippet: doc.pageContent.substring(0, 50) + "..."
            });
        });

        // Guardrail Prompt: Chống bịa đặt (Hallucination)
        const prompt = `Bạn là Trợ lý học tập môn NewTech. Hãy sử dụng DUY NHẤT các tài liệu được cung cấp dưới đây để trả lời câu hỏi.
    - Nếu thông tin KHÔNG CÓ trong tài liệu, HÃY TRẢ LỜI: "Tôi không tìm thấy thông tin này trong tài liệu của bạn." Tuyệt đối không bịa đặt thêm.
    - Cung cấp câu trả lời rõ ràng, dễ hiểu.

    TÀI LIỆU CUNG CẤP:
    ${context}

    CÂU HỎI CỦA SINH VIÊN: ${question}`;

        console.log("Đang chờ Gemini suy nghĩ...");
        const response = await llm.invoke(prompt);

        return res.status(200).json({
            answer: response.content,
            sources: sourcesInfo
        });

    } catch (error) {
        console.error("Lỗi API Chat:", error);
        // Guardrail: Fallback khi AI sập mạng
        return res.status(500).json({ error: 'Hệ thống AI đang bảo trì hoặc quá tải.' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Backend đang chạy tại http://localhost:${PORT}`);
});