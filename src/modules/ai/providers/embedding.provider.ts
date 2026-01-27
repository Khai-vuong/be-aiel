import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmbeddingProvider {
  private readonly logger = new Logger(EmbeddingProvider.name);

  async generateEmbedding(text: string): Promise<number[]> {
    // TODO: Implement local embedding generation (sentence-transformers)
    this.logger.log('Generating embedding - to be implemented');
    throw new Error('Not implemented');
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    // TODO: Implement batch embedding generation
    this.logger.log('Generating batch embeddings - to be implemented');
    throw new Error('Not implemented');
  }
}
