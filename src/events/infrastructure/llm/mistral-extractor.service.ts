import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { LlmExtractor } from './interfaces/llm-extractor.interface';
import { Event } from '../../interfaces/event.interface';
import { HtmlCleaner } from './html-cleaner';
import { EVENT_EXTRACTION_SYSTEM_PROMPT } from './prompts/event-extraction.prompt';
import { CostTrackerService } from './cost-tracker.service';

/**
 * Mistral-basierter Event-Extraktor
 * Nutzt Mistral Small 3.2 für semantische Event-Extraktion aus HTML
 */
@Injectable()
export class MistralExtractorService implements LlmExtractor {
  private readonly logger = new Logger(MistralExtractorService.name);
  private readonly client: OpenAI;

  constructor(private readonly costTracker: CostTrackerService) {
    // Mistral AI API nutzt OpenAI-kompatibles Format
    // baseURL zeigt auf Mistral, nicht auf OpenAI
    this.client = new OpenAI({
      baseURL: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
      apiKey: process.env.MISTRAL_API_KEY || '',
    });

    if (!process.env.MISTRAL_API_KEY) {
      this.logger.warn('MISTRAL_API_KEY nicht gesetzt. LLM-Extraktion wird nicht funktionieren.');
    }
  }

  /**
   * Extrahiert Events aus HTML-Inhalt
   * @param html - Rohes HTML
   * @returns Array von Events (Partial<Event>, ohne id/timestamps)
   */
  async extractEvents(html: string): Promise<Partial<Event>[]> {
    const cleanedHtml = HtmlCleaner.extractMainContent(html);

    try {
      const response = await this.client.chat.completions.create({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: EVENT_EXTRACTION_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `Extrahiere alle Events aus folgendem HTML:\n\n${cleanedHtml}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Keine Antwort von Mistral API erhalten');
      }

      const parsed = JSON.parse(content);
      const events = Array.isArray(parsed.events) ? parsed.events : [];

      // Track Kosten
      const usage = response.usage;
      if (usage) {
        this.costTracker.trackUsage(
          'mistral-small-latest',
          usage.prompt_tokens,
          usage.completion_tokens,
        );
      }

      this.logger.debug(`Mistral-Extraktion erfolgreich: ${events.length} Events gefunden`);

      return events as Partial<Event>[];
    } catch (error) {
      this.logger.error(`Fehler bei Mistral-Extraktion: ${error.message}`, error.stack);
      throw error;
    }
  }
}
