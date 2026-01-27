import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FaqEngineService {
  private readonly logger = new Logger(FaqEngineService.name);

  async search(query: string, courseId?: string) {
    // TODO: Implement local FAQ search using embeddings
    this.logger.log('Searching FAQ - to be implemented');
    return null;
  }
}
