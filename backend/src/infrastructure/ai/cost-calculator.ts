import type { TokenUsage } from './ports';

export interface Pricing {
  inputPer1M: number;
  outputPer1M: number;
}

export class CostCalculator {
  private readonly pricing: Pricing;

  constructor(pricing: Pricing) {
    this.pricing = pricing;
  }

  estimateUsd(usage: TokenUsage): number {
    const cost =
      (usage.promptTokens / 1_000_000) * this.pricing.inputPer1M +
      (usage.completionTokens / 1_000_000) * this.pricing.outputPer1M;
    return Number(cost.toFixed(8));
  }
}

/** ~4 characters per token: only used when the provider does not report usage. */
export function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Prefers provider-reported usage and falls back to an estimate based on text length. */
export function resolveUsage(reported: TokenUsage, promptText: string, completionText: string): TokenUsage {
  return {
    promptTokens: reported.promptTokens > 0 ? reported.promptTokens : approximateTokens(promptText),
    completionTokens: reported.completionTokens > 0 ? reported.completionTokens : approximateTokens(completionText),
  };
}
