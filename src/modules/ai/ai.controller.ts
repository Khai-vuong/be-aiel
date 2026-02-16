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

@Controller('ai')
@UseGuards(JwtGuard, RolesGuard)
export class AiController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

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
    // TODO: Implement get conversations
    return { message: 'Get conversations - to be implemented' };
  }

  @Get('conversations/:id')
  @Roles('any')
  async getConversation(@Request() req, @Param('id') conversationId: string) {
    // TODO: Implement get conversation by ID
    return { message: 'Get conversation - to be implemented' };
  }

  @Post('system-control/analyze')
  @Roles('ADMIN')
  async analyzeSystem(@Request() req, @Body() params: any) {
    // TODO: Implement system analysis
    return { message: 'System analysis - to be implemented' };
  }

  @Post('study-analyst/report')
  @Roles('ADMIN', 'LECTURER')
  async generateReport(@Request() req, @Body() params: any) {
    // TODO: Implement report generation
    return { message: 'Report generation - to be implemented' };
  }

  @Post('tutor/ask')
  @Roles('STUDENT')
  async askTutor(@Request() req, @Body() body: { message: string; courseId?: string }) {
    // TODO: Implement tutor chat
    return { message: 'Tutor chat - to be implemented' };
  }

  @Post('teaching-assistant/generate-quiz')
  @Roles('LECTURER')
  async generateQuiz(@Request() req, @Body() params: any) {
    // TODO: Implement quiz generation
    return { message: 'Quiz generation - to be implemented' };
  }

  @Post('teaching-assistant/summarize-content')
  @Roles('LECTURER')
  async summarizeContent(@Request() req, @Body() params: any) {
    // TODO: Implement content summarization
    return { message: 'Content summarization - to be implemented' };
  }
}
