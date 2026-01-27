import { Injectable, Logger } from '@nestjs/common';
import { AIProviderConfig } from '../models/ai-context.interface';

@Injectable()
export class OpenAiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);

  async generateCompletion(prompt: string, config?: AIProviderConfig) {
    // TODO: Implement OpenAI API integration
    this.logger.log('OpenAI completion - to be implemented');
    throw new Error('Not implemented');
  }

  async generateEmbedding(text: string) {
    // TODO: Implement OpenAI embeddings
    this.logger.log('OpenAI embedding - to be implemented');
    throw new Error('Not implemented');
  }
}
