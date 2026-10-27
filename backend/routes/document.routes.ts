import { Router, Request, Response } from 'express';
import multer from 'multer';
import { DocumentService } from '../services/DocumentService';
import { DatabaseService } from '../services/DatabaseService';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Guardrail < 5MB
});

export const createDocumentRouter = (documentService: DocumentService, dbService: DatabaseService) => {
    const router = Router();

    // Upload & RAG Vector hóa
    router.post('/upload', upload.single('document'), async (req: Request, res: Response): Promise<any> => {
        try {
            if (!req.file) return res.status(400).json({ error: 'Vui lòng đính kèm file hợp lệ.' });

            const chunksCount = await documentService.processPDF(req.file.buffer, req.file.originalname);
            return res.status(200).json({
                message: 'Vector hóa thành công!',
                chunksCount,
                fileName: req.file.originalname
            });
        } catch (error) {
            console.error("Lỗi RAG Upload:", error);
            return res.status(500).json({ error: 'Lỗi server khi xử lý file PDF' });
        }
    });

    // Tìm kiếm, lọc và phân trang tài liệu
    router.get('/documents', (req: Request, res: Response): any => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 5;
            const search = ((req.query.search as string) || '').trim().toLowerCase();

            const allDocs = dbService.getDocuments();
            const filteredDocs = search
                ? allDocs.filter(doc => doc.filename.toLowerCase().includes(search))
                : allDocs;

            const totalItems = filteredDocs.length;
            const totalPages = Math.ceil(totalItems / limit) || 1;
            const startIndex = (page - 1) * limit;
            const paginatedDocs = filteredDocs.slice(startIndex, startIndex + limit);

            return res.status(200).json({
                documents: paginatedDocs,
                pagination: { currentPage: page, totalPages, totalItems, limit }
            });
        } catch (err) {
            return res.status(500).json({ error: 'Lỗi đọc database' });
        }
    });

    return router;
};