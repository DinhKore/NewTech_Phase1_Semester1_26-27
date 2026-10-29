import type { Request, Response } from 'express';
import { ValidationError } from '../../shared/errors/app-error';
import { requireUser } from '../auth/auth.middleware';
import type { DocumentService } from './document.service';
import { DocumentIdParamsSchema, ListDocumentsQuerySchema } from './document.schemas';

export class DocumentController {
  private readonly documentService: DocumentService;

  constructor(documentService: DocumentService) {
    this.documentService = documentService;
  }

  upload = async (req: Request, res: Response): Promise<void> => {
    const user = requireUser(req);
    if (!req.file) throw new ValidationError('Vui lòng đính kèm file PDF (field "document").');

    const document = await this.documentService.upload(user, {
      originalName: req.file.originalname,
      buffer: req.file.buffer,
    });
    res.status(201).json({ document });
  };

  list = (req: Request, res: Response): void => {
    const user = requireUser(req);
    const query = ListDocumentsQuerySchema.parse(req.query);
    res.status(200).json(this.documentService.list({ ...query, userId: user.id }));
  };

  remove = (req: Request, res: Response): void => {
    const user = requireUser(req);
    const { id } = DocumentIdParamsSchema.parse(req.params);
    this.documentService.delete(user, id);
    res.status(204).end();
  };
}
