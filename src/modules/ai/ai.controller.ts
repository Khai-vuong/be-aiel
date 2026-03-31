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

  /**
   * HỆ THỐNG CHAT GENERAL (ORCHESTRATOR)
   */
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

//   @Post('study-analyst/report')
//   @Roles('ADMIN', 'LECTURER')
//   async generateReport(@Request() req, @Body() body: any) {
//     return this.orchestratorService.studyAnalystReport(req.user, body);
//   }

//   @Post('tutor/ask')
//   @Roles('STUDENT')
//   async askTutor(
//     @Request() req,
//     @Body() body: { message: string; courseId?: string },
//   ) {
//     // TODO: Implement tutor chat
//     return { message: 'Tutor chat - to be implemented' };
//   }

//   @Post('teaching-assistant/generate-quiz')
//   @Roles('LECTURER')
//   async generateQuiz(@Request() req, @Body() params: any) {
//     // TODO: Implement quiz generation
//     return { message: 'Quiz generation - to be implemented' };
//   }

//   @Post('teaching-assistant/summarize-content')
//   @Roles('LECTURER')
//   async summarizeContent(@Request() req, @Body() params: any) {
//     // TODO: Implement content summarization
//     return { message: 'Content summarization - to be implemented' };
//   }
}
