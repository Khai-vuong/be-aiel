import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Query,
} from '@nestjs/common';

import { OrchestratorService } from './orchestrator/orchestrator.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AiRequestDto } from './models/ai-request.dto';
import { SwaggerAiChat } from './swagger/ai.swagger';

// ADD: import StudyAnalystAIService
import { StudyAnalystAIService } from './services/study-analyst/study-analyst-ai.service';

@Controller('ai')
@UseGuards(JwtGuard, RolesGuard)
export class AiController {
  constructor(
    private readonly orchestratorService: OrchestratorService,

    // ADD: inject service
    private readonly studyAnalystAIService: StudyAnalystAIService,
  ) {}

  @Post('chat')
  @Roles('any')
  @SwaggerAiChat()
  async chat(@Request() req, @Body() aiRequest: AiRequestDto) {
    return this.orchestratorService.processRequest(aiRequest, req.user);
  }

  @Post('chat/direct')
  @Roles('any')
  @SwaggerAiChat()
  async chatDirect(@Request() req, @Body() aiRequest: AiRequestDto) {
    return this.orchestratorService.directChat(aiRequest.text, req.user);
  }

  @Get('conversations')
  @Roles('any')
  async getConversations(@Request() req, @Query('limit') limit?: number) {
    return { message: 'Get conversations - to be implemented' };
  }

  @Get('conversations/:id')
  @Roles('any')
  async getConversation(@Request() req, @Param('id') conversationId: string) {
    return { message: 'Get conversation - to be implemented' };
  }

  @Post('system-control/analyze')
  @Roles('ADMIN')
  async analyzeSystem(@Request() req, @Body() params: any) {
    return { message: 'System analysis - to be implemented' };
  }

  /**
   * =================================
   * STUDY ANALYST APIs
   * =================================
   */

  @Post('study-analyst/report')
  async generateReport(@Body() body: any) {
    return this.studyAnalystAIService.analyzeClass(body.classId);
  }

  @Post('study-analyst/risk')
  async detectRisk(@Body() body: any) {
    return this.studyAnalystAIService.detectStudentRisk(body.classId);
  }

  @Post('study-analyst/recommendations')
  async getRecommendations(@Body() body: any) {
    return this.studyAnalystAIService.generateTeachingRecommendations(
      body.classId,
    );
  }

  /**
   * =================================
   * TUTOR
   * =================================
   */

  @Post('tutor/ask')
  @Roles('STUDENT')
  async askTutor(
    @Request() req,
    @Body() body: { message: string; courseId?: string },
  ) {
    return { message: 'Tutor chat - to be implemented' };
  }

  /**
   * =================================
   * TEACHING ASSISTANT
   * =================================
   */

  @Post('teaching-assistant/generate-quiz')
  @Roles('LECTURER')
  async generateQuiz(@Request() req, @Body() params: any) {
    return { message: 'Quiz generation - to be implemented' };
  }

  @Post('teaching-assistant/summarize-content')
  @Roles('LECTURER')
  async summarizeContent(@Request() req, @Body() params: any) {
    return { message: 'Content summarization - to be implemented' };
  }
}
