import { Injectable, Logger } from '@nestjs/common';
import { IntentClassifierService } from './intent-classifier.service';
import { ContextBuilderService } from './context-builder.service';
import { ResponseAggregatorService } from './response-aggregator.service';
import { PrismaService } from '../../../prisma.service';
import { AiRequestDto } from '../models/ai-request.dto';
import { JwtPayload } from 'src/modules/users/jwt.strategy';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly intentClassifier: IntentClassifierService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly responseAggregator: ResponseAggregatorService,
    private readonly prisma: PrismaService,
  ) {}

  async processRequest(request: AiRequestDto, user: JwtPayload) {

    const userIntent = await this.intentClassifier.classify(request.text, user.role);
    console.log('Classified intent:', userIntent);

    return {
      text: request.text,
      decisions: userIntent,
      role: user.role
    }


    // this.logger.log('Processing AI request - to be implemented');
    // throw new Error('Not implemented');
  }

  async getUserConversations(userId: string, limit: number) {
    // TODO: Implement when AIConversation model is added to schema
    return [];
  }

  async getConversation(conversationId: string, userId: string) {
    // TODO: Implement when AIConversation model is added to schema
    return null;
  }
}
