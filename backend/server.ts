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
//        const response = await fetch(`[https://generativelanguage.googleapis.com/v1beta/models?key=$](https://generativelanguage.googleapis.com/v1beta/models?key=$){process.env.GEMINI_API_KEY}`);
//        const data = await response.json();
//        console.log("🔴 PHẢN HỒI GỐC TỪ GOOGLE API:\n", JSON.stringify(data, null, 2));
//    } catch (error) {
//        console.error("Lỗi fetch:", error);
//    }
//}
//checkAvailableModels()

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

// Khởi tạo AI Models
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

// Dùng SDK chính chủ của Google cho phần Chat & Quiz
const primaryModel = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
const fallbackModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash-latest" });

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

/**
 * Hàm gọi Gemini an toàn:
 * 1. Thử lại tối đa 3 lần nếu dính lỗi 503 (quá tải tạm thời)
 * 2. Nếu vẫn sập, chuyển sang model dự phòng `gemini-3.5-flash-latest`
 * 3. Hỗ trợ tham số responseMimeType để ép kiểu JSON chuẩn khi cần
 */
async function generateContentWithRetry(prompt: string, isJsonOutput: boolean = false) {
    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            maxOutputTokens: isJsonOutput ? 1000 : 400,
            temperature: 0.1,
            ...(isJsonOutput ? { responseMimeType: "application/json" } : {})
        }
    };

    // 1. Thử model chính gemini-flash-lite-latest (Tối đa 3 lần)
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            return await primaryModel.generateContent(payload);
        } catch (error: any) {
            const is503 = error?.status === 503 || error?.message?.includes("503");
            if (is503 && attempt < 3) {
                console.log(`⚠️ Gemini đang quá tải (503). Đang đợi 2.5s để thử lại lần ${attempt}/3...`);
                await new Promise((resolve) => setTimeout(resolve, 2500 * attempt));
            } else if (is503 && attempt === 3) {
                console.log("🔴 Gemini vẫn quá tải. Chuyển sang model dự phòng...");
                break;
            } else {
                throw error;
            }
        }
    }

    // 2. Chạy model dự phòng nếu model chính liên tục nghẽn
    return await fallbackModel.generateContent(payload);
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

        const prompt = `Bạn là Trợ lý AI thông minh. Hãy dựa vào các tài liệu được cung cấp dưới đây để tóm tắt hoặc trả lời câu hỏi của người dùng.
    - Hãy tổng hợp thông tin từ các trích đoạn để trả lời rõ ràng, cô động.
    - CHỈ trả lời dựa trên thông tin có trong tài liệu.
    - Nếu câu hỏi HOÀN TOÀN KHÔNG LIÊN QUAN hoặc không có manh mối nào trong tài liệu, lúc đó mới trả lời: "Tôi không tìm thấy thông tin này trong tài liệu của bạn."

    TÀI LIỆU CUNG CẤP:
    ${context}

    CÂU HỎI CỦA SINH VIÊN: ${question}`;

        console.log("Đang chờ Gemini suy nghĩ...");
        const result = await generateContentWithRetry(prompt, false);
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

// ==========================================
// 3. API TẠO TRẮC NGHIỆM (STRUCTURED OUTPUT)
// ==========================================
app.post('/api/quiz', async (req: Request, res: Response): Promise<any> => {
    try {
        if (!globalVectorStore || globalVectorStore.length === 0) {
            return res.status(400).json({
                error: 'Chưa có tài liệu nào được nạp. Vui lòng upload PDF trước khi tạo quiz.'
            });
        }

        // Lấy tối đa 4 đoạn dữ liệu đại diện từ RAM
        const step = Math.max(1, Math.floor(globalVectorStore.length / 4));
        const sampleChunks = [];
        for (let i = 0; i < globalVectorStore.length && sampleChunks.length < 4; i += step) {
            sampleChunks.push(globalVectorStore[i]);
        }

        const context = sampleChunks
            .map((item, idx) => `[Đoạn ${idx + 1}]: ${item.content}`)
            .join('\n\n');

        const prompt = `Bạn là một giảng viên chuyên nghiệp. Dựa DUY NHẤT vào tài liệu được cung cấp dưới đây, hãy tạo 3 câu hỏi trắc nghiệm ôn tập.

TÀI LIỆU CUNG CẤP:
${context}

YÊU CẦU ĐẦU RA BẮT BUỘC:
- Trả về danh sách câu hỏi trắc nghiệm dạng mảng JSON.
- Mỗi câu hỏi gồm 4 lựa chọn (A, B, C, D), đáp án chính xác (chỉ ghi chữ cái A, B, C hoặc D) và giải thích ngắn gọn.

Mẫu định dạng JSON:
[
  {
    "id": 1,
    "question": "Nội dung câu hỏi?",
    "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
    "answer": "A",
    "explanation": "Giải thích ngắn gọn"
  }
]`;

        console.log("Đang yêu cầu Gemini tạo câu hỏi trắc nghiệm...");

        // Gọi hàm retry an toàn và bật cờ isJsonOutput = true
        const result = await generateContentWithRetry(prompt, true);
        const rawText = result.response.text();

        // Parse trực tiếp dữ liệu JSON
        const quizData = JSON.parse(rawText.trim());

        return res.status(200).json({
            message: "Tạo bài trắc nghiệm thành công!",
            quiz: quizData
        });

    } catch (error) {
        console.error("Lỗi API Quiz:", error);
        return res.status(500).json({
            error: 'Không thể tạo bài trắc nghiệm. Vui lòng thử lại.'
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Backend đang chạy tại http://localhost:${PORT}`);
});