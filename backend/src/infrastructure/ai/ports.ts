export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface GenerationOptions {
  maxOutputTokens?: number;
  temperature?: number;
  /** Ask the model for a JSON-only response. */
  json?: boolean;
}

export interface GenerationResult {
  text: string;
  usage: TokenUsage;
  model: string;
}

export interface StreamHandle {
  /** Text fragments as they arrive. */
  chunks: AsyncIterable<string>;
  /** Resolves after `chunks` is fully consumed, with final usage metadata. */
  result(): Promise<{ usage: TokenUsage; model: string }>;
}

/** Port: any LLM provider. Swap Gemini for another provider by implementing this interface. */
export interface LlmClient {
  generate(prompt: string, options?: GenerationOptions): Promise<GenerationResult>;
  stream(prompt: string, options?: GenerationOptions): Promise<StreamHandle>;
}

/** Port: text embedding provider. */
export interface EmbeddingClient {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
