import path from 'node:path';
import { z } from 'zod';
import type { LogLevel } from '../shared/logger/logger';
import { BACKEND_ROOT } from './paths';

const csv = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
    CORS_ORIGINS: csv,
    DATABASE_PATH: z.string().min(1).default('data/course_assistant.db'),

    GOOGLE_CLIENT_ID: z.string().default('mock-client-id'),
    JWT_SECRET: z.string().min(32, 'must be at least 32 characters').default('super-secret-jwt-key-for-development-purposes-min-32-chars-long'),
    JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(7200),
    ADMIN_EMAILS: csv,

    GEMINI_API_KEY: z.string().min(1, 'is required'),
    GEMINI_CHAT_MODEL: z.string().min(1).default('gemini-flash-lite-latest'),
    GEMINI_FALLBACK_MODEL: z.string().min(1).default('gemini-3.5-flash-latest'),
    GEMINI_EMBEDDING_MODEL: z.string().min(1).default('gemini-embedding-2'),
    AI_PRICE_INPUT_PER_1M: z.coerce.number().nonnegative().default(0.1),
    AI_PRICE_OUTPUT_PER_1M: z.coerce.number().nonnegative().default(0.4),

    RAG_CHUNK_SIZE: z.coerce.number().int().min(100).default(500),
    RAG_CHUNK_OVERLAP: z.coerce.number().int().min(0).default(100),
    RAG_TOP_K: z.coerce.number().int().min(1).max(10).default(3),
    RAG_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.45),

    MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
  })
  .refine((env) => env.RAG_CHUNK_OVERLAP < env.RAG_CHUNK_SIZE, {
    path: ['RAG_CHUNK_OVERLAP'],
    message: 'must be smaller than RAG_CHUNK_SIZE',
  });

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  logLevel: LogLevel;
  corsOrigins: string[];
  databasePath: string;
  auth: {
    googleClientId: string;
    jwtSecret: string;
    jwtExpiresInSeconds: number;
    adminEmails: string[];
  };
  ai: {
    apiKey: string;
    chatModel: string;
    fallbackModel: string;
    embeddingModel: string;
    pricing: { inputPer1M: number; outputPer1M: number };
  };
  rag: {
    chunkSize: number;
    chunkOverlap: number;
    topK: number;
    minScore: number;
  };
  upload: {
    maxBytes: number;
  };
}

export class ConfigError extends Error {
  public readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid environment configuration:\n - ${issues.join('\n - ')}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

/** Pure function: validates the given environment and returns a typed, immutable config. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  }

  const values = parsed.data;
  const databasePath =
    values.DATABASE_PATH === ':memory:' || path.isAbsolute(values.DATABASE_PATH)
      ? values.DATABASE_PATH
      : path.resolve(BACKEND_ROOT, values.DATABASE_PATH);

  return {
    env: values.NODE_ENV,
    isProduction: values.NODE_ENV === 'production',
    port: values.PORT,
    logLevel: values.LOG_LEVEL,
    corsOrigins: values.CORS_ORIGINS.length > 0 ? values.CORS_ORIGINS : ['http://localhost:5173'],
    databasePath,
    auth: {
      googleClientId: values.GOOGLE_CLIENT_ID,
      jwtSecret: values.JWT_SECRET,
      jwtExpiresInSeconds: values.JWT_EXPIRES_IN_SECONDS,
      adminEmails: values.ADMIN_EMAILS.map((email) => email.toLowerCase()),
    },
    ai: {
      apiKey: values.GEMINI_API_KEY,
      chatModel: values.GEMINI_CHAT_MODEL,
      fallbackModel: values.GEMINI_FALLBACK_MODEL,
      embeddingModel: values.GEMINI_EMBEDDING_MODEL,
      pricing: { inputPer1M: values.AI_PRICE_INPUT_PER_1M, outputPer1M: values.AI_PRICE_OUTPUT_PER_1M },
    },
    rag: {
      chunkSize: values.RAG_CHUNK_SIZE,
      chunkOverlap: values.RAG_CHUNK_OVERLAP,
      topK: values.RAG_TOP_K,
      minScore: values.RAG_MIN_SCORE,
    },
    upload: {
      maxBytes: Math.round(values.MAX_UPLOAD_MB * 1024 * 1024),
    },
  };
}
