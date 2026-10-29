import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AppConfig } from './config/env';
import { PROMPTS_DIR } from './config/paths';
import { CostCalculator } from './infrastructure/ai/cost-calculator';
import { GeminiEmbeddingClient, GeminiLlmClient } from './infrastructure/ai/gemini-clients';
import type { EmbeddingClient, LlmClient } from './infrastructure/ai/ports';
import { runMigrations } from './infrastructure/database/migrations';
import { SqliteDatabase } from './infrastructure/database/sqlite-database';
import {
  SimplePdfTextExtractor,
  RecursiveTextChunker,
  type PdfTextExtractor,
} from './infrastructure/pdf/pdf-processing';
import { PromptNames, PromptRepository } from './infrastructure/prompts/prompt-repository';
import { InMemoryVectorIndex, type VectorIndex } from './infrastructure/vector/vector-index';
import { MetricsService } from './modules/admin/metrics.service';
import { AiUsageRecorder } from './modules/ai-usage/ai-usage.recorder';
import { AiUsageRepository } from './modules/ai-usage/ai-usage.repository';
import { AuthService } from './modules/auth/auth.service';
import { GoogleOAuthVerifier, type GoogleIdentityVerifier } from './modules/auth/google-identity-verifier';
import { JwtTokenService } from './modules/auth/token.service';
import { UserRepository } from './modules/auth/user.repository';
import { ChatRepository } from './modules/chat/chat.repository';
import { ChatService } from './modules/chat/chat.service';
import { DocumentRepository } from './modules/documents/document.repository';
import { DocumentService } from './modules/documents/document.service';
import { QuizService } from './modules/quiz/quiz.service';
import type { Logger } from './shared/logger/logger';

/** External systems that tests replace with fakes. */
export interface ExternalPorts {
  llm: LlmClient;
  embeddings: EmbeddingClient;
  googleVerifier: GoogleIdentityVerifier;
  pdfExtractor: PdfTextExtractor;
}

export interface Container {
  config: AppConfig;
  logger: Logger;
  database: SqliteDatabase;
  vectorIndex: VectorIndex;
  authService: AuthService;
  documentService: DocumentService;
  chatService: ChatService;
  quizService: QuizService;
  metricsService: MetricsService;
  userRepository: UserRepository;
  dispose(): void;
}

/**
 * Composition root: the ONLY place that knows which concrete class implements which interface.
 * Everything else receives its dependencies through constructors.
 */
export function buildContainer(config: AppConfig, logger: Logger, overrides: Partial<ExternalPorts> = {}): Container {
  // Infrastructure
  const database = new SqliteDatabase(config.databasePath);
  runMigrations(database, logger);

  const genAI = new GoogleGenerativeAI(config.ai.apiKey);
  const llm =
    overrides.llm ??
    new GeminiLlmClient(genAI, { primaryModel: config.ai.chatModel, fallbackModel: config.ai.fallbackModel }, logger);
  const embeddings = overrides.embeddings ?? new GeminiEmbeddingClient(genAI, config.ai.embeddingModel, logger);
  const googleVerifier = overrides.googleVerifier ?? new GoogleOAuthVerifier(config.auth.googleClientId);
  const pdfExtractor = overrides.pdfExtractor ?? new SimplePdfTextExtractor();
  const chunker = new RecursiveTextChunker(config.rag.chunkSize, config.rag.chunkOverlap);

  const prompts = new PromptRepository(PROMPTS_DIR);
  prompts.assertAvailable(Object.values(PromptNames));

  const vectorIndex = new InMemoryVectorIndex();
  const costCalculator = new CostCalculator(config.ai.pricing);

  // Repositories
  const userRepository = new UserRepository(database);
  const documentRepository = new DocumentRepository(database);
  const chatRepository = new ChatRepository(database);
  const aiUsageRepository = new AiUsageRepository(database);

  // Services
  const usageRecorder = new AiUsageRecorder(aiUsageRepository, costCalculator, logger);

  const authService = new AuthService({
    users: userRepository,
    googleVerifier,
    tokens: new JwtTokenService(config.auth.jwtSecret, config.auth.jwtExpiresInSeconds),
    adminEmails: config.auth.adminEmails,
    logger,
  });

  const documentService = new DocumentService({
    repository: documentRepository,
    vectorIndex,
    pdfExtractor,
    chunker,
    embeddings,
    logger,
  });

  const chatService = new ChatService({
    repository: chatRepository,
    vectorIndex,
    llm,
    embeddings,
    prompts,
    usageRecorder,
    logger,
    rag: { topK: config.rag.topK, minScore: config.rag.minScore },
  });

  const quizService = new QuizService({
    vectorIndex,
    documents: documentRepository,
    llm,
    prompts,
    usageRecorder,
    logger,
  });

  const metricsService = new MetricsService(aiUsageRepository);

  // Rebuild the in-memory vector index from persisted chunks.
  const storedChunks = documentRepository.loadAllChunks();
  vectorIndex.addMany(storedChunks);
  logger.info('vector index restored', { chunks: storedChunks.length });

  return {
    config,
    logger,
    database,
    vectorIndex,
    authService,
    documentService,
    chatService,
    quizService,
    metricsService,
    userRepository,
    dispose: () => database.close(),
  };
}
