import { Injectable } from '@nestjs/common';

@Injectable()
export class PerformanceCalculatorService {
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
