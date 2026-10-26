import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAI } from "@google/generative-ai"; // Thêm SDK chính chủ của Google

dotenv.config();

//// Sửa lại hàm kiểm tra để in raw data
//async function checkAvailableModels() {
//    try {
//        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
//        const data = await response.json();
//        console.log("🔴 PHẢN HỒI GỐC TỪ GOOGLE API:\n", JSON.stringify(data, null, 2));
//    } catch (error) {
//        console.error("Lỗi fetch:", error);
//    }
//}
//checkAvailableModels();






const app = express();
app.use(cors());
app.use(express.json());

// Guardrail: Chặn file > 5MB trên RAM để chống sập server
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Cấu trúc lưu trữ Vector thủ công trên RAM
interface MemoryChunk {
    content: string;
    vector: number[];
}

let globalVectorStore: MemoryChunk[] = [];

// Khởi tạo AI Models (Tách biệt Embedding chính chủ và LLM Langchain)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
// Dùng luôn SDK chính chủ của Google cho phần Chat, không dùng Langchain nữa
const chatModel = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
// Hàm toán học tính độ tương đồng Cosine
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
            chunkOverlap: 200,
        });
        const docs = await textSplitter.splitDocuments(rawDocs);

        console.log(`Đã băm thành ${docs.length} đoạn. Đang mã hóa Vector và lưu vào RAM...`);

        globalVectorStore = [];

        // Sử dụng hàm embedContent chính chủ từ Google SDK
        for (const doc of docs) {
            const result = await embeddingModel.embedContent(doc.pageContent);
            globalVectorStore.push({
                content: doc.pageContent,
                vector: result.embedding.values
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
// 2. API CHAT RAG 
// ==========================================
app.post('/api/chat', async (req: Request, res: Response): Promise<any> => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: 'Vui lòng nhập câu hỏi.' });
        }

        if (globalVectorStore.length === 0) {
            return res.status(400).json({
                error: 'Chưa có tài liệu nào được nạp. Vui lòng upload PDF trước.'
            });
        }

        console.log(`Nhận câu hỏi: "${question}"`);

        // Chuyển đổi câu hỏi bằng Google SDK
        const embedResult = await embeddingModel.embedContent(question);
        const questionVector = embedResult.embedding.values;

        const scoredDocs = globalVectorStore.map(item => ({
            content: item.content,
            score: cosineSimilarity(questionVector, item.vector)
        }));

        scoredDocs.sort((a, b) => b.score - a.score);
        const top3Docs = scoredDocs.slice(0, 3);

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

        const prompt = `Bạn là Trợ lý học tập thông minh. Hãy sử dụng DUY NHẤT các tài liệu được cung cấp dưới đây để trả lời câu hỏi.
    - Nếu thông tin KHÔNG CÓ trong tài liệu, HÃY TRẢ LỜI: "Tôi không tìm thấy thông tin này trong tài liệu của bạn." Tuyệt đối không bịa đặt thêm.
    - Cung cấp câu trả lời rõ ràng, dễ hiểu.

    TÀI LIỆU CUNG CẤP:
    ${context}

    CÂU HỎI CỦA SINH VIÊN: ${question}`;

        console.log("Đang chờ Gemini suy nghĩ...");
        // Gọi thẳng từ SDK chính chủ của Google
        const result = await chatModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: 1000,
            }
        }, { timeout: 30000 }); // Ép ngắt sau 30 giây nếu không có phản hồi

        const responseText = result.response.text();

        return res.status(200).json({
            answer: responseText,
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