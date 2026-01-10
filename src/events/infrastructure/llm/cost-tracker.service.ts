import { Injectable, Logger } from '@nestjs/common';

/**
 * Tracking-Service für LLM-API-Kosten
 * Verfolgt Token-Verbrauch und berechnet Kosten basierend auf Modell-Pricing
 */
@Injectable()
export class CostTrackerService {
  private readonly logger = new Logger(CostTrackerService.name);
  private costs: Map<string, number> = new Map();
  private tokenUsage: Map<string, { input: number; output: number }> = new Map();

  private readonly MODEL_PRICING: Record<string, { input: number; output: number }> = {
    'mistral-small-latest': { input: 0.075, output: 0.2 },
    'mistral-small-2409': { input: 0.075, output: 0.2 },
    'gemini-2.0-flash': { input: 0.1, output: 0.4 },
    'deepseek-chat': { input: 0.27, output: 1.1 },
  };

  /**
   * Verfolgt Token-Verbrauch und berechnet Kosten
   * @param model - Modell-Name
   * @param inputTokens - Anzahl Input-Tokens
   * @param outputTokens - Anzahl Output-Tokens
   */
  trackUsage(model: string, inputTokens: number, outputTokens: number): void {
    const pricing = this.MODEL_PRICING[model];
    if (!pricing) {
      this.logger.warn(`Keine Pricing-Information für Modell: ${model}`);
      return;
    }

    const cost =
      (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;

    const current = this.costs.get(model) || 0;
    this.costs.set(model, current + cost);

    const currentUsage = this.tokenUsage.get(model) || { input: 0, output: 0 };
    this.tokenUsage.set(model, {
      input: currentUsage.input + inputTokens,
      output: currentUsage.output + outputTokens,
    });

    this.logger.log(
      `${model}: +$${cost.toFixed(4)} (Input: ${inputTokens}, Output: ${outputTokens}, Gesamt: $${(current + cost).toFixed(2)})`,
    );
  }

  /**
   * Gibt monatliche Kosten zurück
   * @returns Kosten pro Modell mit Gesamtsumme
   */
  getMonthlyCosts(): {
    costs: Record<string, number>;
    total: number;
    currency: string;
  } {
    const costs = Object.fromEntries(this.costs);
    const total = Array.from(this.costs.values()).reduce((sum, cost) => sum + cost, 0);

    return {
      costs,
      total: Number(total.toFixed(4)),
      currency: 'USD',
    };
  }

  /**
   * Gibt Token-Verbrauch zurück
   * @returns Token-Verbrauch pro Modell mit Gesamtsummen
   */
  getTokenUsage(): {
    usage: Record<string, { input: number; output: number; total: number }>;
    totals: { input: number; output: number; total: number };
  } {
    const usage: Record<string, { input: number; output: number; total: number }> = {};

    let totalInput = 0;
    let totalOutput = 0;

    for (const [model, tokens] of this.tokenUsage.entries()) {
      const total = tokens.input + tokens.output;
      usage[model] = {
        input: tokens.input,
        output: tokens.output,
        total,
      };
      totalInput += tokens.input;
      totalOutput += tokens.output;
    }

    return {
      usage,
      totals: {
        input: totalInput,
        output: totalOutput,
        total: totalInput + totalOutput,
      },
    };
  }

  /**
   * Setzt monatliche Kosten zurück
   */
  resetMonthlyCosts(): void {
    this.costs.clear();
    this.tokenUsage.clear();
    this.logger.log('Monatliche Kosten zurückgesetzt');
  }
}
