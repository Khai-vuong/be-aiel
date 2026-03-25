import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma.service';

@Injectable()
export class PerformanceCalculatorService {
  constructor(private prisma: PrismaService) {}

  async calculateQuizMetrics(classId: string) {
    const totalStudents = await this.prisma.student.count({
      where: {
        classes: {
          some: { clid: classId },
        },
      },
    });

    const attempts = await this.prisma.attempt.findMany({
      where: {
        student: {
          classes: {
            some: { clid: classId },
          },
        },
        quiz: {
          class_id: classId,
        },
      },
      select: { percentage: true },
    });

    if (attempts.length === 0) {
      return {
        totalStudents,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: '0%',
      };
    }

    const scores = attempts.map((a) => a.percentage || 0);
    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const passCount = scores.filter((score) => score > 5.0).length;
    const passRate = ((passCount / scores.length) * 100).toFixed(1) + '%';

    return {
      totalStudents,
      averageScore: parseFloat(averageScore.toFixed(2)),
      highestScore: parseFloat(highestScore.toFixed(2)),
      lowestScore: parseFloat(lowestScore.toFixed(2)),
      passRate,
    };
  }

  calculateMetrics(students: any[]) {
    const total = students.length;

    const avgScore = students.reduce((sum, s) => sum + s.score, 0) / total;

    const atRisk = students.filter((s) => s.score < 50);

    const completionRate = students.filter((s) => s.completed).length / total;

    return {
      totalStudents: total,
      averageScore: avgScore.toFixed(2),
      atRiskCount: atRisk.length,
      completionRate: (completionRate * 100).toFixed(1),
    };
  }
}
