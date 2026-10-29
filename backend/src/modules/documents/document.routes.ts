import { Router } from 'express';
import multer from 'multer';
import { ValidationError } from '../../shared/errors/app-error';
import { asyncHandler } from '../../shared/utils/async-handler';
import type { AuthMiddleware } from '../auth/auth.middleware';
import type { DocumentController } from './document.controller';

export function createDocumentRouter(
  controller: DocumentController,
  auth: AuthMiddleware,
  maxUploadBytes: number,
): Router {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxUploadBytes, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (file.mimetype !== 'application/pdf') {
        callback(new ValidationError('Chỉ chấp nhận file PDF.'));
        return;
      }
      callback(null, true);
    },
  });

  const router = Router();
  router.use(auth.authenticate);
  router.get('/', controller.list);
  router.post('/', upload.single('document'), asyncHandler(controller.upload));
  router.delete('/:id', controller.remove);
  return router;
}
