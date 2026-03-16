import { Injectable, Logger } from '@nestjs/common';
import { IntentClassifierService } from './intent-classifier.service';
import { PrismaService } from '../../../prisma.service';
import { AiRequestDto } from '../dtos/ai-request.dto';
import { AiResponseDto } from '../dtos/ai-response.dto';
import { JwtPayload } from 'src/modules/users/jwt.strategy';
import { OuterApiService } from '../services/outer-api/outer-api.service';
import { StudyAnalystAIService } from '../services/study-analyst/study-analyst-ai.service';
import { ConversationService } from '../services/conversation.service';
import {
  SummarizationService,
  SummarizeOptions,
} from '../services/summarization.service';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly intentClassifier: IntentClassifierService,
    private readonly prisma: PrismaService,
    private readonly outerApiService: OuterApiService,
    private readonly studyAnalystAIService: StudyAnalystAIService,
    private readonly conversationService: ConversationService,
    private readonly summarizationService: SummarizationService,
  ) {}

  /**
   * MAIN AI PIPELINE
   */
  async processRequest(request: AiRequestDto, user: JwtPayload) {
    this.logger.log('AI request received');

    const intent = await this.intentClassifier.classifyIntent(
      request.text,
      user.role,
    );

    this.logger.log(`Intent detected: ${intent}`);

    switch (intent) {
      case 'class_analysis':
        return this.handleClassAnalysis(request, user);
      case 'teaching_recommendation':
        return this.handleStudentRisk(request, user);
      default:
        return this.handleGeneralChat(request, user);
    }
  }

  /**
   * USE CASE 1: CLASS PERFORMANCE ANALYSIS
   */
  private async handleClassAnalysis(request: AiRequestDto, user: JwtPayload) {
    this.logger.log('Routing to Study Analyst AI');
    const classId = request.metadata?.classId || 'demo-class';
    const prompt = request.text || 'Provide an overview of class performance.';
    const result = await this.studyAnalystAIService.analyzeClass(
      classId,
      prompt,
      user.uid,
      user.role,
    );

    return {
      usecase: 'CLASS_ANALYSIS',
      ...result,
    };
  }

  /**
   * USE CASE 2: STUDENT RISK DETECTION
   */
  private async handleStudentRisk(request: AiRequestDto, user: JwtPayload) {
    this.logger.log('Student risk detection');
    const classId = request.metadata?.classId;
    if (!classId) throw new Error('Class ID is required');

    const classData = await this.prisma.class.findUnique({
      where: { clid: classId },
      include: {
        students: {
          include: {
            attempts: {
              include: { quiz: true },
              orderBy: { started_at: 'desc' },
            },
            enrollments: true,
          },
        },
        course: true,
      },
    });

    if (!classData) throw new Error('Class not found');

    const students = classData.students.map((student) => {
      const scores = student.attempts
        .filter((a) => a.score !== null)
        .map((a) => a.score!);
      const avg =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
      return {
        id: student.sid,
        name: student.name,
        score: Math.round(avg * 100) / 100,
        completed: student.attempts.some((a) => a.status === 'submitted'),
      };
    });

    const riskyStudents = students.filter((s) => s.score < 50);
    const aiResult = await this.outerApiService.chat({
      prompt: `Identify risk for: ${JSON.stringify(riskyStudents)}`,
      role: user.role,
      caller: 'risk-analysis',
      provider: 'openai',
    });

    return { usecase: 'STUDENT_RISK', riskyStudents, analysis: aiResult.text };
  }

  /**
   * USE CASE 3: GENERAL AI CHAT
   */
  private async handleGeneralChat(request: AiRequestDto, user: JwtPayload) {
    const result = await this.outerApiService.chat({
      prompt: request.text,
      role: user.role,
      caller: 'general',
      provider: 'groq',
    });
    return { usecase: 'GENERAL_CHAT', text: result.text };
  }

  /**
   * CONVERSATION & DIRECT CHAT
   */
  async directChat(
    request: AiRequestDto,
    user: JwtPayload,
  ): Promise<AiResponseDto> {
    const startTime = Date.now();
    let conversationId = request.conversationId;

    if (!conversationId) {
      const titleRes = await this.summarizationService.summarize(request.text, {
        minLength: 3,
        maxLength: 7,
      } as SummarizeOptions);
      const conv = await this.conversationService.createConversation({
        userId: user.uid,
        title: titleRes.summary || 'New Chat',
      });
      conversationId = conv.acid;
    }

    const userMsg = await this.conversationService.createMessage({
      conversationId,
      role: 'user',
      content: request.text,
    });
    const result = await this.outerApiService.chat({
      prompt: request.text,
      role: user.role,
      caller: 'direct',
      provider: 'groq',
      conversationId,
      userId: user.uid,
    });
    const assistantMsg = await this.conversationService.createMessage({
      conversationId,
      role: 'assistant',
      content: result.text,
      modelName: result.provider,
    });

    return {
      success: true,
      conversationId,
      messageId: assistantMsg.amid,
      role: 'assistant',
      text: result.text,
      metadata: { processingTime: Date.now() - startTime },
    } as AiResponseDto;
  }

  async summarize(text: string, provider?: 'gemini' | 'groq' | 'openai') {
    const start = Date.now();
    const res = await this.summarizationService.summarize(text, {
      provider,
      minLength: 3,
      maxLength: 7,
    } as SummarizeOptions);
    return { processTime: Date.now() - start, result: res };
  }
}
