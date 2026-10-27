// backend/services/DocumentService.ts
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { DatabaseService } from './DatabaseService';
import { VectorStoreService, MemoryChunk } from './VectorStoreService';
import { AIService } from './AIService';

export class DocumentService {
    private dbService: DatabaseService;
    private vectorStore: VectorStoreService;
    private aiService: AIService;

    constructor(dbService: DatabaseService, vectorStore: VectorStoreService, aiService: AIService) {
        this.dbService = dbService;
        this.vectorStore = vectorStore;
        this.aiService = aiService;
    }

    // Quy trình băm PDF -> Embedding -> Lưu SQLite + RAM
    public async processPDF(fileBuffer: Buffer, originalName: string): Promise<number> {
        console.log(`Đang đọc và băm file PDF: ${originalName}...`);
        const fileArrayBuffer = new Uint8Array(fileBuffer);
        const blob = new Blob([fileArrayBuffer], { type: 'application/pdf' });
        const loader = new PDFLoader(blob);
        const rawDocs = await loader.load();

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const docs = await textSplitter.splitDocuments(rawDocs);

        console.log(`Đã băm thành ${docs.length} đoạn. Đang tạo Vector...`);
        const newChunks: MemoryChunk[] = [];
        for (const doc of docs) {
            const vector = await this.aiService.getEmbedding(doc.pageContent);
            newChunks.push({ content: doc.pageContent, vector });
        }

        // Lưu vào SQLite
        const docId = this.dbService.saveDocument(originalName, docs.length);
        this.dbService.saveChunks(docId, newChunks);

        // Nạp lại vào RAM
        this.vectorStore.setChunks(newChunks);
        console.log(`💾 [OOP DocumentService] Đã lưu và nạp ${newChunks.length} vector chunks!`);

        return docs.length;
    }
}