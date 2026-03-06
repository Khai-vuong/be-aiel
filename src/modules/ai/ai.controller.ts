import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Delete,
  Patch,
  Put,
} from '@nestjs/common';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { ConversationService } from './services/conversation.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AiRequestDto } from './dtos/ai-request.dto';
import { SwaggerAiChat } from './swagger/ai.swagger';

@Controller('ai')
@UseGuards(JwtGuard, RolesGuard)
export class AiController {
  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly conversationService: ConversationService,
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
    return this.orchestratorService.directChat(aiRequest, req.user);
  }

  @Get('conversations')
  @Roles('any')
  async getConversations(
    @Request() req,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    // @Query('status') status?: 'active' | 'archived',
  ) {
    return this.conversationService.findUserConversations({
      userId: req.user.uid,
      // status,
      limit,
      offset,
    });
  }

  @Get('conversations/:id')
  @Roles('any')
  async getConversation(
    @Request() req,
    @Param('id') conversationId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('beforeMessageId') beforeMessageId?: string,
  ) {
    return this.conversationService.getConversationWithMessages(
      conversationId,
      req.user.uid,
      { limit, beforeMessageId },
    );
  }

  @Put('conversations/:id')
  @Roles('any')
  async updateConversation(
    @Request() req,
    @Param('id') conversationId: string,
    @Body() body: { title?: string; status?: 'active' | 'archived' },
  ) {
    return this.conversationService.updateConversation(
      conversationId,
      req.user.uid,
      body,
    );
  }

  @Delete('conversations/:id')
  @Roles('any')
  async deleteConversation(@Request() req, @Param('id') conversationId: string) {
    await this.conversationService.deleteConversation(conversationId, req.user.uid);
    return { message: 'Conversation deleted successfully' };
  }

  // @Put('conversations/:id/archive')
  // @Roles('any')
  // async archiveConversation(@Request() req, @Param('id') conversationId: string) {
  //   return this.conversationService.archiveConversation(conversationId, req.user.uid);
  // }



  // @Post('study-analyst/report')
  // @Roles('ADMIN', 'LECTURER')
  // async generateReport(
  //   @Request() req,
  //   @Body()
  //   body: {
  //     prompt: string;
  //     classId?: string;
  //     courseId?: string;
  //   },
  // ) {
  //   const aiRequest: AiRequestDto = {
  //     text: body.prompt,
  //     serviceType: 'STUDY_ANALYST',
  //     metadata: {
  //       classId: body.classId,
  //       courseId: body.courseId,
  //     },
  //   };

  //   return this.orchestratorService.processRequest(aiRequest, req.user);
  // }

//   @Post('study-analyst/report')
//   @Roles('ADMIN', 'LECTURER')
//   async generateReport(@Request() req, @Body() body: any) {
//     const { prompt, classId } = body;

//     return {
//       role: req.user.role,
//       prompt,
//       classId,
//       insight: `Class ${classId} has an average quiz score of 72%.
// 2 students are at risk (score < 50%).
// Completion rate is decreasing over the last 2 weeks.`,
//     };
//   }

  @Post('study-analyst/report')
  @Roles('ADMIN', 'LECTURER')
  async generateReport(@Request() req, @Body() body: any) {
    return this.orchestratorService.studyAnalystReport(req.user, body);
  }

  @Post('tutor/ask')
  @Roles('STUDENT')
  async askTutor(
    @Request() req,
    @Body() body: { message: string; courseId?: string },
  ) {
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
