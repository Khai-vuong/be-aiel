import { Injectable, Logger } from '@nestjs/common';
import { AIContext } from '../../models/ai-context.interface';

@Injectable()
export class StudyAnalystAiService {
  private readonly logger = new Logger(StudyAnalystAiService.name);

  async process(message: string, context: AIContext) {
    // TODO: Implement study analyst AI logic
    this.logger.log('Processing study analyst request - to be implemented');
    throw new Error('Not implemented');
  }
}
