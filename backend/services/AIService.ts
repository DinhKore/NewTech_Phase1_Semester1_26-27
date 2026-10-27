import { GoogleGenerativeAI } from "@google/generative-ai";

export class AIService {
    private genAI: GoogleGenerativeAI;
    private embeddingModel: any;
    private primaryModel: any;
    private fallbackModel: any;

    constructor(apiKey: string) {
        if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.embeddingModel = this.genAI.getGenerativeModel({ model: "gemini-embedding-2" });
        this.primaryModel = this.genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
        this.fallbackModel = this.genAI.getGenerativeModel({ model: "gemini-3.5-flash-latest" });
    }

    // Vector hóa văn bản
    public async getEmbedding(text: string): Promise<number[]> {
        const result = await this.embeddingModel.embedContent(text);
        return result.embedding.values;
    }

    // Cơ chế gọi Gemini với Retry và Fallback an toàn
    public async generateContentWithRetry(prompt: string, isJsonOutput: boolean = false): Promise<string> {
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: isJsonOutput ? 1000 : 400,
                temperature: 0.1,
                ...(isJsonOutput ? { responseMimeType: "application/json" } : {})
            }
        };

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const res = await this.primaryModel.generateContent(payload);
                return res.response.text();
            } catch (error: any) {
                const is503 = error?.status === 503 || error?.message?.includes("503");
                if (is503 && attempt < 3) {
                    console.log(`⚠️ Gemini (503). Đang đợi để thử lại lần ${attempt}/3...`);
                    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
                } else if (is503 && attempt === 3) {
                    console.log("🔴 Chuyển sang model dự phòng...");
                    break;
                } else {
                    throw error;
                }
            }
        }

        const fallbackRes = await this.fallbackModel.generateContent(payload);
        return fallbackRes.response.text();
    }

    // Sinh câu hỏi trắc nghiệm Structured Output
    public async generateQuiz(context: string): Promise<any> {
        const prompt = `Bạn là một giảng viên chuyên nghiệp. Dựa DUY NHẤT vào tài liệu dưới đây, hãy tạo 3 câu hỏi trắc nghiệm ôn tập:
${context}

Định dạng JSON bắt buộc:
[
  {
    "id": 1,
    "question": "Nội dung câu hỏi?",
    "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
    "answer": "A",
    "explanation": "Giải thích ngắn gọn"
  }
]`;

        const rawText = await this.generateContentWithRetry(prompt, true);
        return JSON.parse(rawText.trim());
    }
}