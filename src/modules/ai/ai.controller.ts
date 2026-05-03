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
  Put,
} from '@nestjs/common';
import {
  ApiBody,
  ApiProperty,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { OrchestratorService } from './orchestrator/orchestrator.service';
import { ConversationService } from './services/conversation.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AiRequestDto } from './dtos/ai-request.dto';
import { SwaggerAiChat } from './swagger/ai.swagger';
import { StudyAnalystAIService } from './services/study-analyst/study-analyst-ai.service';
import { OuterApiProvider } from './services/outer-api/outer-api.service';
import { QuizGenerationService } from './services/Quiz-gen/quizGeneration.service';
import { title } from 'node:process';

/**
 * DTO dành riêng cho việc test Study Analyst trên Swagger
 * Giúp hiển thị ô nhập Prompt và ClassId
 */
class StudyAnalystPromptDto {
  @ApiProperty({
    example: 'Give me an overview of quiz results for class L01.',
    description: 'Câu hỏi bằng ngôn ngữ tự nhiên về dữ liệu học tập',
  })
  prompt: string;

  @ApiProperty({
    example: 'L01',
    description: 'Mã lớp học cần phân tích',
  })
  classId: string;
}

@ApiTags('AI - Study Analyst')
@ApiBearerAuth() // Hiển thị biểu tượng ổ khóa để nhập Token trên Swaggerimport { OuterApiProvider } from './services/outer-api/outer-api.service';
@Controller('ai')
@UseGuards(JwtGuard, RolesGuard)
export class AiController {
  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly conversationService: ConversationService,
    private readonly quizGenerationService: QuizGenerationService,
    private readonly studyAnalystAIService: StudyAnalystAIService,
  ) {}

  @Post('chat')
  @Roles('any')
  @SwaggerAiChat()
  async chat(@Request() req, @Body() aiRequest: AiRequestDto) {
    return this.orchestratorService.processRequest(aiRequest, req.user);
  }

  //Testing quan trọng: Chat trực tiếp bỏ qua orchestrator để test API của các provider bên ngoài (Gemini, Groq, OpenAI)
  @Post('chat/direct')
  @Roles('any')
  @SwaggerAiChat()
  async chatDirect(@Request() req, @Body() aiRequest: AiRequestDto) {
    return this.orchestratorService.directChat(aiRequest, req.user);
  }

  /**
   * QUẢN LÝ HỘI THOẠI
   */
  @Get('conversations')
  @Roles('any')
  async getConversations(
    @Request() req,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.conversationService.findUserConversations({
      userId: req.user.uid,
      limit,
      offset,
    });
  }

  @Get('conversations/:id/messages')
  @Roles('any')
  async getConversationMessages(
    @Request() req,
    @Param('id') conversationId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('beforeMessageId') beforeMessageId?: string,
  ) {
    return this.conversationService.getConversationWithMessages(
      conversationId,
      req.user.uid,
      {
        limit,
        beforeMessageId,
      },
    );
  }

  @Put('conversations/:id/rename')
  @Roles('any')
  async renameConversation(
    @Request() req,
    @Param('id') conversationId: string,
    @Body() body: { title: string },
  ) {
    await this.conversationService.updateConversation(
      conversationId,
      req.user.uid,
      { title: body.title }
    );
    return { message: 'Conversation renamed successfully' };
  }

  @Put('conversations/:id/archive')
  @Roles('any')
  async archiveConversation(
    @Request() req,
    @Param('id') conversationId: string,
    @Body() body: { archived: boolean },
  ) {
    await this.conversationService.archiveConversation(
      conversationId,
      req.user.uid,
    );
    return { message: 'Conversation archived successfully' };
  }

  @Delete('conversations/:id')
  @Roles('any')
  async deleteConversation(
    @Request() req,
    @Param('id') conversationId: string,
  ) {
    await this.conversationService.deleteConversation(
      conversationId,
      req.user.uid,
    );
    return { message: 'Conversation deleted successfully' };
  }

// ------------------ DEV TEST ZONE ------------------

  @Post('summarize')
  @Roles('any')
  async summarize(@Body() body: { text: string }) {
    return this.orchestratorService.summarize(body.text);
  }

  @Post('quizgen')
  @Roles('Lecturer', 'Admin')
  async generateQuiz(
    @Request() req,
    @Body()
    body: AiRequestDto,
  ) {
    return this.quizGenerationService.generateQuiz({
      prompt: body.text,
      role: req.user.role,
      provider: body.provider as OuterApiProvider,
    });
  }

  @Post('rag/test')
  @Roles('any')
  async testRag(@Request() req, @Body() body: { text: string }) {
    return this.orchestratorService.testRag(req, body);
  }



    /**
   * USE CASE 1: CLASS PERFORMANCE ANALYSIS
   * Lecturer nhập prompt để nhận thống kê: Tổng SV, Điểm TB, Tỉ lệ đạt...
   */
  @Post('study-analyst/report')
  @Roles('Lecturer', 'Admin')
  @ApiOperation({ summary: 'Truy vấn báo cáo học tập bằng Prompt (Overview)' })
  @ApiBody({ type: StudyAnalystPromptDto })
  async generateReport(@Request() req, @Body() body: StudyAnalystPromptDto) {
    return this.studyAnalystAIService.analyzeClass(
      body.classId,
      body.prompt,
      req.user.uid,
      req.user.role,
    );
  }

  /**
   * USE CASE 2: IDENTIFY TOP & BOTTOM STUDENTS
   * Nhận diện sinh viên học tốt và sinh viên có rủi ro
   */
  @Post('study-analyst/risk')
  @Roles('Lecturer', 'Admin')
  @ApiOperation({
    summary: 'Phát hiện sinh viên có nguy cơ (Identify Top/Bottom)',
  })
  @ApiBody({ type: StudyAnalystPromptDto })
  async detectRisk(@Request() req, @Body() body: StudyAnalystPromptDto) {
    return this.studyAnalystAIService.detectStudentRisk(
      body.classId,
      body.prompt,
      req.user.uid,
      req.user.role,
    );
  }

  /**
   * USE CASE 3: COMPLETION TRENDS & RECOMMENDATIONS
   * Phân tích xu hướng hoàn thành bài tập và đưa ra lời khuyên
   */
  @Post('study-analyst/recommendations')
  @Roles('Lecturer', 'Admin')
  @ApiOperation({ summary: 'Lấy xu hướng hoàn thành và khuyến nghị giảng dạy' })
  @ApiBody({ type: StudyAnalystPromptDto })
  async getRecommendations(
    @Request() req,
    @Body() body: StudyAnalystPromptDto,
  ) {
    const prompt =
      body.prompt ||
      'Show the quiz completion trend in the last 3 months in this course.';

    return this.studyAnalystAIService.generateTeachingRecommendations(
      body.classId,
      prompt,
      req.user.uid,
      req.user.role,
    );
  }

  /**
   * MODULE 2 / USE CASE 4: KNOWLEDGE GAP ANALYSIS
   * Phân tích lỗ hổng kiến thức và điểm mù chung của lớp
   */
  @Post('study-analyst/knowledge-gap')
  @Roles('Lecturer', 'Admin')
  @ApiOperation({
    summary: 'Phân tích lỗ hổng kiến thức và Ma trận kỹ năng (Knowledge Gap)',
  })
  @ApiBody({ type: StudyAnalystPromptDto })
  async analyzeKnowledgeGaps(
    @Request() req,
    @Body() body: StudyAnalystPromptDto,
  ) {
    const prompt =
      body.prompt ||
      'Analyze the knowledge gaps, weak skills, and common misconceptions for this class.';

    return this.studyAnalystAIService.analyzeKnowledgeGaps(
      body.classId,
      prompt,
      req.user.uid,
      req.user.role,
    );
  }
}