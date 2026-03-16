import { Injectable, Logger } from '@nestjs/common';
import { OuterApiService } from './outer-api/outer-api.service';

export interface SummarizeOptions {
  maxLength?: number;
  minLength?: number;
  provider?: 'gemini' | 'groq' | 'openai';
  customsystemPrompt?: string;
  onlyUseSystemPrompt?: boolean;
}

export interface SummarizeResult {
  success: boolean;
  summary?: string;
  originalLength?: number;
  summaryLength?: number;
  processingTime?: number;
  provider?: string;
  error?: string;
}

@Injectable()
export class SummarizationService {
  private readonly logger = new Logger(SummarizationService.name);

  constructor(private readonly outerApiService: OuterApiService) {}

  /**
   * Summarize text using outer API
   * @param text The text to summarize
   * @param options Optional configuration for summarization
   * @returns Summarization result with summary and metadata
   */
  async summarize(
    text: string,
    options?: SummarizeOptions,
  ): Promise<SummarizeResult> {
    const startTime = Date.now();

    try {
      this.logger.log('Starting text summarization via outer API');

      // Validate input
      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: 'Text cannot be empty',
          processingTime: Date.now() - startTime,
        };
      }

      // Build summarization prompt
      const maxLength = options?.maxLength || 150;
      const minLength = options?.minLength || 40;

      const prompt = this.buildSummarizationPrompt(text, maxLength, minLength);

      // Call outer API
      const result = await this.outerApiService.chat({
        prompt,
        role: 'system',
        caller: 'summarization',
        provider: options?.provider,
        temperature: 0.3, // Lower temperature for more deterministic output
        customSystemPrompt: options?.customsystemPrompt ||
          'You are a professional text summarizer. Provide concise, accurate summaries.',
        onlyUseSystemPrompt: options?.onlyUseSystemPrompt || false,
      });

      const summary = result.text.trim();
      const processingTime = Date.now() - startTime;

      this.logger.log(
        `Summarization completed via ${result.provider} in ${processingTime}ms`,
      );

      return {
        success: true,
        summary,
        originalLength: text.length,
        summaryLength: summary.length,
        processingTime,
        provider: result.provider,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('Summarization failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime,
      };
    }
  }

  /**
   * Build the summarization prompt
   */
  private buildSummarizationPrompt(
    text: string,
    maxLength: number,
    minLength: number,
  ): string {
    return `Summarize the following text in approximately ${minLength}-${maxLength} words. Keep the most important information and main ideas. Stay concise and clear.

Text to summarize:
${text}

Summary:`;
  }
}
