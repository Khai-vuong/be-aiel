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
    defaultClassId: string, // Nhận classId từ request body làm dự phòng
    prompt: string,
    userId: string,
    userRole: string,
  ) {
    try {
      // 1. AI TRÍCH XUẤT THỰC THỂ TỪ PROMPT
      console.log('Đang phân tích câu lệnh:', prompt);
      const extracted =
        await this.insightGenerator.extractEntitiesFromPrompt(prompt);

      // Ưu tiên lấy classId do AI tìm được trong câu chữ, nếu không có mới dùng defaultClassId
      const targetClassId = extracted.classId || defaultClassId;
      const targetQuizId = extracted.quizId;

      console.log(
        `Đã trích xuất: ClassID=${targetClassId}, QuizID=${targetQuizId}`,
      );

      // 2. KIỂM TRA PHÂN QUYỀN
      if (userRole === 'Lecturer') {
        const classData = await this.prisma.class.findUnique({
          where: { clid: targetClassId },
          include: { lecturer: true },
        });

        if (!classData || classData.lecturer?.user_id !== userId) {
          throw new ForbiddenException(
            'You do not have permission to view this class or it does not exist.',
          );
        }
      }

      // 3. TỐI ƯU QUERY DATABASE: Xây dựng bộ lọc (Filter)
      const queryFilter: any = {
        student: { classes: { some: { clid: targetClassId } } },
        quiz: { class_id: targetClassId },
      };

      // Nếu AI phát hiện người dùng nhắc đến 1 Quiz cụ thể -> Thêm điều kiện lọc để Query cực nhẹ
      if (targetQuizId) {
        // Tuỳ thuộc vào cấu trúc DB của bạn, ví dụ trường id của quiz là qid
        // (Nếu DB bạn là quiz_id thì sửa thành: quiz_id: targetQuizId)
        queryFilter.quiz_id = targetQuizId;
      }

      // 4. LẤY DỮ LIỆU THÔ (Với bộ lọc đã tối ưu)
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

      console.log(
        `Đã fetch ${attempts.length} records. Bắt đầu AI nhận xét...`,
      );

      // 5. AI PHÂN TÍCH VÀ NHẬN XÉT
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

      return { classId, timestamp: new Date().toISOString(), ...aiAnalysis };
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
      // 1. Phân quyền
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

      // 2. Lấy dữ liệu bài làm kèm thời gian
      const attempts = await this.prisma.attempt.findMany({
        where: {
          student: { classes: { some: { clid: classId } } },
          quiz: { class_id: classId },
        },
        // SỬA Ở ĐÂY: Dùng đúng tên cột trong database của bạn
        select: { submitted_at: true, started_at: true },
      });

      // 3. Gom nhóm số lượng bài nộp theo Tháng-Năm (YYYY-MM)
      const monthlyStats: Record<string, number> = {};
      attempts.forEach((a) => {
        // SỬA Ở ĐÂY: Ưu tiên submitted_at, dự phòng started_at
        const date = new Date(a.submitted_at || a.started_at || new Date());

        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyStats[monthYear] = (monthlyStats[monthYear] || 0) + 1;
      });

      let rawDataString = 'No quiz data available to analyze trends.';
      if (Object.keys(monthlyStats).length > 0) {
        rawDataString = Object.entries(monthlyStats)
          .sort(([monthA], [monthB]) => monthA.localeCompare(monthB)) // Sắp xếp theo thời gian
          .map(
            ([month, count]) => `Month: ${month}, Total Submissions: ${count}`,
          )
          .join('\n');
      }

      console.log('Gửi dữ liệu cho AI phân tích Trend:\n', rawDataString);

      // 4. Gọi AI xử lý xu hướng
      const aiAnalysis = await this.insightGenerator.generateTrendInsight(
        prompt,
        rawDataString,
      );

      return {
        classId,
        timestamp: new Date().toISOString(),
        ...aiAnalysis,
      };
    } catch (error) {
      console.error('Error in generateTeachingRecommendations:', error);
      throw error;
    }
  }
}
