import path from 'node:path';

/** Absolute path of the `backend/` folder (works from both `src/` and `dist/`). */
export const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

export const PROMPTS_DIR = path.join(BACKEND_ROOT, 'prompts');
