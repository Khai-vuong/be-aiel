import { Injectable, ForbiddenException } from '@nestjs/common';
import { InsightGeneratorService } from './insight-generator.service';
import { ReportBuilderService } from './report-builder.service';
import { PrismaService } from '../../../../prisma.service';

@Injectable()
export class StudyAnalystAIService {
  constructor(
    private insightGenerator: InsightGeneratorService,
    private reportBuilder: ReportBuilderService,
    private prisma: PrismaService,
  ) {}

  // ==========================================
  // USE CASE 1: CLASS PERFORMANCE OVERVIEW
  // ==========================================
  async analyzeClass(
    defaultClassId: string,
    prompt: string,
    userId: string,
    userRole: string,
  ) {
    try {
      const extracted =
        await this.insightGenerator.extractEntitiesFromPrompt(prompt);
      const targetClassId = extracted.classId || defaultClassId;
      const targetQuizId = extracted.quizId;

      if (userRole === 'Lecturer') {
        const classData = await this.prisma.class.findUnique({
          where: { clid: targetClassId },
          include: { lecturer: true },
        });
        if (!classData || classData.lecturer?.user_id !== userId) {
          throw new ForbiddenException(
            'You do not have permission to view this class.',
          );
        }
      }

      const queryFilter: any = {
        student: { classes: { some: { clid: targetClassId } } },
        quiz: { class_id: targetClassId },
      };

      // Nâng cấp: Lọc theo Quiz cụ thể nếu AI trích xuất được
      if (targetQuizId) {
        queryFilter.quiz_id = targetQuizId;
      }

      const attempts = await this.prisma.attempt.findMany({
        where: queryFilter,
        select: {
          percentage: true,
          quiz_id: true,
          student: { select: { sid: true } },
        },
      });

      let rawDataString = 'No quiz attempts found.';
      if (attempts.length > 0) {
        rawDataString = attempts
          .map(
            (a) =>
              `Quiz ID: ${a.quiz_id}, Student ID: ${a.student.sid}, Score: ${a.percentage || 0}`,
          )
          .join('\n');
      }

      const aiAnalysis = await this.insightGenerator.generateTextualInsight(
        prompt,
        rawDataString,
      );

      return {
        classId: targetClassId,
        quizId: targetQuizId,
        timestamp: new Date().toISOString(),
        ...aiAnalysis,
      };
    } catch (error) {
      console.error('Error in analyzeClass:', error);
      throw error;
    }
  }

  // ==========================================
  // USE CASE 2: TOP & BOTTOM STUDENTS RISK DETECTION
  // ==========================================
  async detectStudentRisk(
    classId: string,
    prompt: string,
    userId: string,
    userRole: string,
  ) {
    try {
      const extracted =
        await this.insightGenerator.extractEntitiesFromPrompt(prompt);
      const targetClassId = classId;
      const targetQuizId = extracted.quizId;

      if (userRole === 'Lecturer') {
        const classData = await this.prisma.class.findUnique({
          where: { clid: targetClassId },
          include: { lecturer: true },
        });
        if (!classData || classData.lecturer?.user_id !== userId) {
          throw new ForbiddenException(
            'You do not have permission to view this class.',
          );
        }
      }

      const queryFilter: any = {
        student: { classes: { some: { clid: targetClassId } } },
        quiz: { class_id: targetClassId },
      };

      // Nâng cấp: Chỉ xét rủi ro dựa trên 1 Quiz cụ thể nếu được yêu cầu
      if (targetQuizId) {
        queryFilter.quiz_id = targetQuizId;
      }

      const attempts = await this.prisma.attempt.findMany({
        where: queryFilter,
        select: {
          percentage: true,
          student: { select: { sid: true } },
        },
      });

      const studentScores: Record<
        string,
        { sid: string; total: number; count: number }
      > = {};
      attempts.forEach((a) => {
        const sid = a.student.sid;
        if (!studentScores[sid])
          studentScores[sid] = { sid, total: 0, count: 0 };
        studentScores[sid].total += a.percentage || 0;
        studentScores[sid].count += 1;
      });

      const studentAverages = Object.values(studentScores).map((s) => ({
        studentId: s.sid,
        averageScore: parseFloat((s.total / s.count).toFixed(2)),
      }));

      let rawDataString = 'No student data available.';
      if (studentAverages.length > 0) {
        rawDataString = studentAverages
          .map(
            (s) => `Student: ${s.studentId}, Average Score: ${s.averageScore}`,
          )
          .join('\n');
      }

      const aiAnalysis = await this.insightGenerator.generateRiskInsight(
        prompt,
        rawDataString,
      );

      return {
        classId: targetClassId,
        quizId: targetQuizId,
        timestamp: new Date().toISOString(),
        ...aiAnalysis,
      };
    } catch (error) {
      console.error('Error in detectStudentRisk:', error);
      throw error;
    }
  }

  // ==========================================
  // USE CASE 3: COMPLETION TRENDS & STRATEGIES
  // ==========================================
  async generateTeachingRecommendations(
    classId: string,
    prompt: string,
    userId: string,
    userRole: string,
  ) {
    try {
      if (userRole === 'Lecturer') {
        const classData = await this.prisma.class.findUnique({
          where: { clid: classId },
          include: { lecturer: true },
        });
        if (!classData || classData.lecturer?.user_id !== userId) {
          throw new ForbiddenException(
            'You do not have permission to view this class.',
          );
        }
      }

      const attempts = await this.prisma.attempt.findMany({
        where: {
          student: { classes: { some: { clid: classId } } },
          quiz: { class_id: classId },
        },
        select: { submitted_at: true, started_at: true },
      });

      const monthlyStats: Record<string, number> = {};
      attempts.forEach((a) => {
        const date = new Date(a.submitted_at || a.started_at || new Date());
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyStats[monthYear] = (monthlyStats[monthYear] || 0) + 1;
      });

      let rawDataString = 'No quiz data available to analyze trends.';
      if (Object.keys(monthlyStats).length > 0) {
        rawDataString = Object.entries(monthlyStats)
          .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
          .map(
            ([month, count]) => `Month: ${month}, Total Submissions: ${count}`,
          )
          .join('\n');
      }

      const aiAnalysis = await this.insightGenerator.generateTrendInsight(
        prompt,
        rawDataString,
      );

      return { classId, timestamp: new Date().toISOString(), ...aiAnalysis };
    } catch (error) {
      console.error('Error in generateTeachingRecommendations:', error);
      throw error;
    }
  }

  // ==========================================
  // USE CASE 4: KNOWLEDGE GAP ANALYSIS
  // ==========================================
  async analyzeKnowledgeGaps(
    classId: string,
    prompt: string,
    userId: string,
    userRole: string,
  ) {
    try {
      // Ép cứng Class ID từ Body, Quiz ID trích xuất linh hoạt từ Prompt
      const targetClassId = classId;
      const extracted =
        await this.insightGenerator.extractEntitiesFromPrompt(prompt);
      const targetQuizId = extracted.quizId;

      console.log(
        `\n[DEBUG] Phân tích lớp: ${targetClassId} | Quiz: ${targetQuizId || 'Tất cả'}`,
      );

      const queryFilter: any = {
        attempt: {
          student: { classes: { some: { clid: targetClassId } } },
        },
      };

      // Chỉ lọc câu trả lời của Quiz cụ thể nếu có yêu cầu
      if (targetQuizId) {
        queryFilter.attempt.quiz_id = targetQuizId;
      }

      const answers = await this.prisma.answer.findMany({
        where: queryFilter,
        include: { question: true },
      });

      console.log(`[DEBUG] Prisma tìm thấy: ${answers.length} câu trả lời.`);

      const questionStats: Record<string, any> = {};
      answers.forEach((ans) => {
        const qId = ans.question_id || 'unknown_question';
        if (!questionStats[qId]) {
          questionStats[qId] = {
            content: ans.question?.content || `Question ID: ${qId}`,
            tags: 'Unknown Topic', // Bạn có thể map tag thực tế từ ans.question tại đây
            total: 0,
            correct: 0,
            wrongAnswers: {},
          };
        }

        questionStats[qId].total += 1;
        if (ans.is_correct) {
          questionStats[qId].correct += 1;
        } else {
          let selectedStr = 'Unknown';
          if (ans.answer_json) {
            try {
              const parsed =
                typeof ans.answer_json === 'string'
                  ? JSON.parse(ans.answer_json)
                  : ans.answer_json;
              selectedStr =
                parsed.selected || parsed.answer || JSON.stringify(parsed);
            } catch (e) {
              selectedStr = String(ans.answer_json);
            }
          }
          questionStats[qId].wrongAnswers[selectedStr] =
            (questionStats[qId].wrongAnswers[selectedStr] || 0) + 1;
        }
      });

      let rawDataString = 'No detailed answer data available.';
      const statsArray = Object.values(questionStats);

      if (statsArray.length > 0) {
        rawDataString = statsArray
          .map((stats) => {
            const passRate = ((stats.correct / stats.total) * 100).toFixed(1);
            let str = `[Tags: ${stats.tags}]\nQuestion: ${stats.content}\n- Pass rate: ${passRate}%\n`;
            const wrongEntries = Object.entries(stats.wrongAnswers).sort(
              (a: any, b: any) => b[1] - a[1],
            );
            if (wrongEntries.length > 0) {
              const topWrong: any = wrongEntries[0];
              const wrongPercentage = (
                (topWrong[1] / stats.total) *
                100
              ).toFixed(1);
              str += `- Most common wrong answer: "${topWrong[0]}" (chosen by ${wrongPercentage}% of failed students)\n`;
            }
            return str;
          })
          .join('\n\n');
      }

      const aiAnalysis =
        await this.insightGenerator.generateKnowledgeGapInsight(
          prompt,
          rawDataString,
        );

      return {
        classId: targetClassId,
        quizId: targetQuizId,
        timestamp: new Date().toISOString(),
        ...aiAnalysis,
      };
    } catch (error) {
      console.error('Error in analyzeKnowledgeGaps:', error);
      throw error;
    }
  }

  
}
