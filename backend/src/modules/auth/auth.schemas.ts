import { z } from 'zod';

export const GoogleLoginBodySchema = z.object({
  /** Google ID token returned by Google Identity Services (the "credential" field). */
  credential: z.string().min(20, 'credential is required').max(4096),
});

export type GoogleLoginBody = z.infer<typeof GoogleLoginBodySchema>;
