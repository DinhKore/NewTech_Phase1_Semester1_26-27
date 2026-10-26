import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Guardrail: Chặn file > 5MB trên RAM để chống sập server
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Cấu trúc lưu trữ Vector thủ công trên RAM (Bypass mọi lỗi thư viện vector)
interface MemoryChunk {
    content: string;
    vector: number[];
}

let globalVectorStore: MemoryChunk[] = [];

// Khởi tạo AI Models từ Google Gemini
const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "text-embedding-004", // Model chuyên băm vector
});

const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-1.5-flash",
    temperature: 0, // AI trả lời nghiêm túc, bám sát tài liệu
});

// Hàm toán học tính độ tương đồng Cosine giữa 2 mảng vector
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ==========================================
// 1. API UPLOAD FILE & VECTOR HÓA (RAG)
// ==========================================
app.post('/api/upload', upload.single('document'), async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Vui lòng đính kèm file hợp lệ.' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Thiếu cấu hình GEMINI_API_KEY ở Backend.' });
        }

        console.log("Đang đọc và băm file PDF...");
        const fileArrayBuffer = new Uint8Array(req.file.buffer);
        const blob = new Blob([fileArrayBuffer], { type: 'application/pdf' });
        const loader = new PDFLoader(blob);
        const rawDocs = await loader.load();

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200, // Gối đầu 200 ký tự để giữ nguyên ngữ cảnh câu
        });
        const docs = await textSplitter.splitDocuments(rawDocs);

        console.log(`Đã băm thành ${docs.length} đoạn. Đang mã hóa Vector và lưu vào RAM...`);

        // Xóa sạch dữ liệu cũ, chuẩn bị nạp tài liệu mới
        globalVectorStore = [];

        // Mã hóa từng đoạn văn thành Vector và lưu vào mảng RAM
        for (const doc of docs) {
            const vector = await embeddings.embedQuery(doc.pageContent);
            globalVectorStore.push({
                content: doc.pageContent,
                vector: vector
            });
        }

        console.log("Hoàn tất lưu trữ Vector!");
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
// 2. API CHAT RAG (Có tính điểm Cosine % & Guardrails)
// ==========================================
app.post('/api/chat', async (req: Request, res: Response): Promise<any> => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: 'Vui lòng nhập câu hỏi.' });
        }

        // Rào chắn (Guardrail): Bắt lỗi chưa upload file tài liệu
        if (globalVectorStore.length === 0) {
            return res.status(400).json({
                error: 'Chưa có tài liệu nào được nạp. Vui lòng upload PDF trước.'
            });
        }

        console.log(`Nhận câu hỏi: "${question}"`);

        // Bước 1: Biến câu hỏi của user thành Vector
        const questionVector = await embeddings.embedQuery(question);

        // Bước 2: Quét toàn bộ kho RAM và tính điểm Cosine Similarity với từng đoạn
        const scoredDocs = globalVectorStore.map(item => ({
            content: item.content,
            score: cosineSimilarity(questionVector, item.vector)
        }));

        // Bước 3: Sắp xếp kết quả giảm dần và lấy Top 3 đoạn phù hợp nhất
        scoredDocs.sort((a, b) => b.score - a.score);
        const top3Docs = scoredDocs.slice(0, 3);

        // Rào chắn: Nếu điểm tương đồng quá thấp, coi như không tìm thấy
        if (top3Docs.length === 0 || top3Docs[0].score < 0.15) {
            return res.status(200).json({
                answer: "Xin lỗi, tôi không tìm thấy thông tin này trong tài liệu của bạn.",
                confidence: "0%"
            });
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

        // Guardrail Prompt: Chống bịa đặt (Hallucination)
        const prompt = `Bạn là Trợ lý học tập thông minh. Hãy sử dụng DUY NHẤT các tài liệu được cung cấp dưới đây để trả lời câu hỏi.
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
        return res.status(500).json({ error: 'Hệ thống AI đang bảo trì hoặc quá tải.' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Backend đang chạy tại http://localhost:${PORT}`);
});