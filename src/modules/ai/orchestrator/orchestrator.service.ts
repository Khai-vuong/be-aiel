import { Injectable, Logger } from '@nestjs/common';
import { IntentClassifierService } from './intent-classifier.service';
import { ContextBuilderService } from './context-builder.service';
import { ResponseAggregatorService } from './response-aggregator.service';
import { PrismaService } from '../../../prisma.service';
import { AiRequestDto } from '../models/ai-request.dto';
import { JwtPayload } from 'src/modules/users/jwt.strategy';
import { OuterApiService } from '../services/outer-api/outer-api.service';
import { StudyAnalystAIService } from '../services/study-analyst/study-analyst-ai.service';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly intentClassifier: IntentClassifierService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly responseAggregator: ResponseAggregatorService,
    private readonly prisma: PrismaService,
    private readonly outerApiService: OuterApiService,
    private readonly studyAnalystAIService: StudyAnalystAIService,
  ) {}

  /**
   * MAIN AI PIPELINE
   */
  async processRequest(request: AiRequestDto, user: JwtPayload) {
    this.logger.log('AI request received');

    /**
     * STEP 1
     * Intent Classification
     */
    const intent = await this.intentClassifier.classifyIntent(
      request.text,
      user.role,
    );

    this.logger.log(`Intent detected: ${intent}`);

    /**
     * STEP 2
     * Route intent to correct service
     */
    switch (intent) {
      case 'class_analysis':
        return this.handleClassAnalysis(request, user);

      case 'teaching_recommendation':
        return this.handleStudentRisk(request, user);

      case 'system_config':
      case 'general_ai':
      default:
        return this.handleGeneralChat(request, user);
    }
  }

  /**
   * =================================
   * USE CASE 1
   * CLASS PERFORMANCE ANALYSIS
   * =================================
   */
  private async handleClassAnalysis(request: AiRequestDto, user: JwtPayload) {
    this.logger.log('Routing to Study Analyst AI');

    const classId = request.metadata?.classId || 'demo-class';

    const result = await this.studyAnalystAIService.analyzeClass(classId);

    const aiResponse = await this.outerApiService.chat({
      prompt: result.prompt,
      role: user.role,
      caller: 'study-analyst',
      provider: 'openai',
    });

    return {
      usecase: 'CLASS_ANALYSIS',
      metrics: result.metrics,
      insights: result.insights,
      aiInsight: aiResponse.text,
    };
  }

  /**
   * =================================
   * USE CASE 2
   * STUDENT RISK DETECTION
   * =================================
   */
  private async handleStudentRisk(request: AiRequestDto, user: JwtPayload) {
    this.logger.log('Student risk detection');

    const classId = request.metadata?.classId;
    if (!classId) {
      throw new Error('Class ID is required for student risk analysis');
    }

    // Query students in the class with their attempts and enrollments
    const classData = await this.prisma.class.findUnique({
      where: { clid: classId },
      include: {
        students: {
          include: {
            attempts: {
              include: {
                quiz: true,
              },
              orderBy: {
                started_at: 'desc',
              },
            },
            enrollments: true,
          },
        },
        course: true,
      },
    });

    if (!classData) {
      throw new Error('Class not found');
    }

    // Process student data
    const students = classData.students.map((student) => {
      // Calculate average score from attempts
      const attempts = student.attempts;
      const scores = attempts
        .filter((attempt) => attempt.score !== null)
        .map((attempt) => attempt.score!);

      const averageScore =
        scores.length > 0
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : 0;

      // Check if completed (has successful attempts or enrollment status)
      const hasCompletedAttempts = attempts.some(
        (attempt) =>
          attempt.status === 'submitted' || attempt.status === 'graded',
      );
      const enrollmentCompleted = student.enrollments.some(
        (enrollment) =>
          enrollment.course_id === classData.course_id &&
          enrollment.status === 'Completed',
      );

      const completed = hasCompletedAttempts || enrollmentCompleted;

      return {
        id: student.sid,
        name: student.name,
        score: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
        completed,
        attemptCount: attempts.length,
      };
    });

    const riskyStudents = students.filter((s) => s.score < 50 || !s.completed);

    const prompt = `
You are an educational data analyst.

User role: ${user.role}

Task:
Identify students at risk of failing.

Data:
${JSON.stringify(riskyStudents)}

Provide a concise explanation.
`;

    const aiResult = await this.outerApiService.chat({
      prompt,
      role: user.role,
      caller: 'risk-analysis',
      provider: 'openai',
    });

    return {
      usecase: 'STUDENT_RISK',
      riskyStudents,
      analysis: aiResult.text,
    };
  }

  /**
   * =================================
   * USE CASE 3
   * GENERAL AI CHAT
   * =================================
   */
  private async handleGeneralChat(request: AiRequestDto, user: JwtPayload) {
    this.logger.log('General AI chat');

    const aiResult = await this.outerApiService.chat({
      prompt: request.text,
      role: user.role,
      caller: 'general-chat',
      provider: 'groq',
    });

    return {
      usecase: 'GENERAL_CHAT',
      response: aiResult.text,
    };
  }

  /**
   * Direct chat endpoint
   */
  async directChat(text: string, user: JwtPayload) {
    const result = await this.outerApiService.chat({
      prompt: text,
      role: user.role,
      caller: 'general',
      provider: 'groq',
    });

    return result.text;
  }

  async getUserConversations(userId: string, limit: number) {
    return [];
  }

  async getConversation(conversationId: string, userId: string) {
    return null;
  }
}
