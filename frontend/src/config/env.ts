export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/api\/?$/, ''),
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  maxUploadMb: Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? 5),
} as const;
