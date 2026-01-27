import { Injectable, Logger } from '@nestjs/common';
import { AIProviderConfig } from '../models/ai-context.interface';

@Injectable()
export class AnthropicProvider {
  private readonly logger = new Logger(AnthropicProvider.name);

  async generateCompletion(prompt: string, config?: AIProviderConfig) {
    // TODO: Implement Anthropic Claude API integration
    this.logger.log('Anthropic completion - to be implemented');
    throw new Error('Not implemented');
  }
}
