// backend/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import Services
import { DatabaseService } from './services/DatabaseService';
import { VectorStoreService } from './services/VectorStoreService';
import { AIService } from './services/AIService';
import { AuthService } from './services/AuthService';
import { DocumentService } from './services/DocumentService';

// Import Modular Routers
import { createAuthRouter } from './routes/auth.routes';
import { createDocumentRouter } from './routes/document.routes';
import { createChatRouter } from './routes/chat.routes';
import { createQuizRouter } from './routes/quiz.routes';
import { createAdminRouter } from './routes/admin.routes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. KHỞI TẠO SERVICES (DEPENDENCY INJECTION)
const dbService = new DatabaseService('course_assistant.db');
const vectorStoreService = new VectorStoreService();
const aiService = new AIService(process.env.GEMINI_API_KEY as string);
const authService = new AuthService(dbService);
const documentService = new DocumentService(dbService, vectorStoreService, aiService);

// 2. PHỤC HỒI VECTOR LÊN RAM KHI SERVER KHỞI ĐỘNG
const savedChunks = dbService.getAllChunks();
if (savedChunks.length > 0) {
    vectorStoreService.setChunks(savedChunks);
    console.log(`🔄 [OOP System] Đã phục hồi ${vectorStoreService.count} đoạn Vector từ SQLite lên RAM!`);
}

// 3. ĐĂNG KÝ CÁC PHÂN HỆ ROUTE (CLEAN MODULAR ARCHITECTURE)
app.use('/api/auth', createAuthRouter(authService));
app.use('/api', createDocumentRouter(documentService, dbService));
app.use('/api/chat', createChatRouter(aiService, dbService, vectorStoreService));
app.use('/api/quiz', createQuizRouter(aiService, dbService, vectorStoreService));
app.use('/api/admin', createAdminRouter(authService, dbService));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 [Clean Modular Server] Backend đang chạy tại http://localhost:${PORT}`);
});