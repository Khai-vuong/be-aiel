import { Injectable } from "@nestjs/common";
import {ExecutionAction} from "./rag-planner.service";
import { PrismaService } from "src/prisma.service";
import {
    flattenJsonToCsvTable,
    flattenJsonToTable,
} from "../../utils/rag-data-format.util";

export type ExecutionContext = { 
    capabilityId: string; 
    result?: any; 
    error?: string 
;}

type LogRetrieveParams = {
    limit?: number;
    offset?: number;
    logType?: string;
};

type LogFromUserParams = {
    userId?: string;
    limit?: number;
    offset?: number;
};

type EnrollmentRetrieveParams = {
    status?: string;
    start_range?: string;
    end_range?: string;
    limit?: number;
    offset?: number;
};

type ClassOverviewParams = {
    classId?: string;
    quizId?: string;
};

type ClassFilesParams = {
    classId?: string;
};

type ClassQuizzesParams = {
    classId?: string;
};

type ClassStudentsParams = {
    classId?: string;
};

type ClassLecturerParams = {
    classId?: string;
};

type QueryStudentParams = {
    classId?: string;
    quizId?: string;
    take?: number;
    threshold?: number;
    comparison?: string;
};

type TeachingRecommendationParams = {
    classId?: string;
};

type KnowledgeGapParams = {
    classId?: string;
    quizId?: string;
};

@Injectable()
export class RagPlanExecuterService {
    constructor(
        private readonly prisma: PrismaService,
    ) {}

    private readonly handlers: Record<
        string,
        (step: ExecutionAction) => Promise<any>
    > = {
        'log-retrive': (step) => this.executeLogRetrieve(step),
        'log-from-user': (step) => this.executeLogFromUser(step),
        'enrollments': (step) => this.executeEnrollments(step),
        'class-overview': (step) => this.executeClassOverview(step),
        'class-files': (step) => this.executeClassFiles(step),
        'class-quizzes': (step) => this.executeClassQuizzes(step),
        'class-students': (step) => this.executeClassStudents(step),
        'class-lecturer': (step) => this.executeClassLecturer(step),
        'analyze-quiz-performance': (step) => this.executeAnalyseQuizPerformance(step),
        'teaching-recommendation': (step) => this.executeTeachingRecommendation(step),
        'knowledge-gap': (step) => this.executeKnowledgeGap(step),
    };

    private toSafeNumber(value: unknown, fallback: number): number {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return fallback;
        }
        return Math.floor(parsed);
    }

    private toRequiredString(value: unknown, fieldName: string): string {
        const normalized = typeof value === 'string' ? value.trim() : '';
        if (!normalized) {
            throw new Error(`Missing required parameter: ${fieldName}`);
        }
        return normalized;
    }

    private async executeLogRetrieve(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as LogRetrieveParams;
        const limit = Math.min(this.toSafeNumber(params.limit, 100), 500);
        const offset = this.toSafeNumber(params.offset, 0);
        const logType = typeof params.logType === 'string' ? params.logType.trim() : '';

        const fetchLogs = await this.prisma.log.findMany({
            where: {
                ...(logType ? { action: logType } : {}),
            },
            orderBy: {
                created_at: 'desc',
            },
            skip: offset,
            take: limit,
            include: {
                user: {
                    select: {
                        uid: true,
                    },
                },
            },
        });

        const users = new Set(fetchLogs.map((log) => log.user.uid));
        const userData = await this.prisma.user.findMany({
            where: {
                uid: { in: Array.from(users) },
            },
            select: {
                uid: true,
                username: true,
                role: true,
            },
        });


        return flattenJsonToTable('Logs', fetchLogs) + '\n' + flattenJsonToTable('Users', userData);
    }

    private async executeLogFromUser(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as LogFromUserParams;
        const userId = typeof params.userId === 'string' ? params.userId.trim() : '';
        const limit = Math.min(this.toSafeNumber(params.limit, 100), 500);
        const offset = this.toSafeNumber(params.offset, 0);
        
        if (!userId) {
            throw new Error('Missing required parameter: userId');
        }

        const fetchUser = this.prisma.user.findUnique({
            where: { uid: userId },
            select: { 
                uid: true,
                username: true,
                role: true,
            },
        })

        const fetchLogs = this.prisma.log.findMany({
            where: {
                user_id: userId,
            },
            select: {
                action: true,
                resource_type: true,
                resource_id: true,
                created_at: true,
            },
            orderBy: {
                created_at: 'desc',
            },
            skip: offset,
            take: limit,
        });

        const [user, logs] = await Promise.all([fetchUser, fetchLogs]);

        return flattenJsonToTable('User', user!) + '\n' + flattenJsonToTable('Logs', logs);
    }

    private async executeEnrollments(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as EnrollmentRetrieveParams;
        const status = typeof params.status === 'string' ? params.status.trim() : '';
        const startRangeRaw = typeof params.start_range === 'string' ? params.start_range.trim() : '';
        const endRangeRaw = typeof params.end_range === 'string' ? params.end_range.trim() : '';
        const limit = Math.min(this.toSafeNumber(params.limit, 100), 500);
        const offset = this.toSafeNumber(params.offset, 0);

        // Parse and validate date ranges
        let startRange: Date | null = null;
        let endRange: Date | null = null;

        if (startRangeRaw) {
            const parsedStart = new Date(startRangeRaw);
            if (Number.isFinite(parsedStart.getTime())) {
                startRange = parsedStart;
            }
        }

        if (endRangeRaw) {
            const parsedEnd = new Date(endRangeRaw);
            if (Number.isFinite(parsedEnd.getTime())) {
                endRange = parsedEnd;
            }
        }

        // Build where clause dynamically
        const where: any = {};
        
        if (status) {
            where.status = status;
        }

        if (startRange || endRange) {
            where.enrolled_at = {};
            if (startRange) {
                where.enrolled_at.gte = startRange;
            }
            if (endRange) {
                where.enrolled_at.lte = endRange;
            }
        }

        const fetchEnrollments = await this.prisma.courseEnrollment.findMany({
            where,
            include: {
                student: {
                    select: {
                        name: true,
                        major: true,
                    },
                },
                course: {
                    select: {
                        code: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                enrolled_at: 'desc',
            },
            skip: offset,
            take: limit,
        });

        return flattenJsonToCsvTable('Enrollments', fetchEnrollments);
    }

    private async executeClassOverview(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as ClassOverviewParams;
        const classId = this.toRequiredString(params.classId, 'classId');
        const quizId = typeof params.quizId === 'string' ? params.quizId.trim() : '';

        const where: any = {
            student: { classes: { some: { clid: classId } } },
            quiz: { class_id: classId },
        };

        if (quizId) {
            where.quiz_id = quizId;
        }

        const attempts = await this.prisma.attempt.findMany({
            where,
            select: {
                percentage: true,
                quiz_id: true,
                quiz: {
                    select: {
                        qid: true,
                        name: true,
                    },
                },
                student: {
                    select: {
                        sid: true,
                        name: true,
                    },
                },
            },
        });

        const uniqueStudents = new Set(attempts.map((attempt) => attempt.student.sid));
        const totalAttempts = attempts.length;

        const studentMap: Record<
            string,
            {
                studentName: string;
                totalAttempts: number;
                totalScore: number;
                highestScore: number;
                lowestScore: number;
            }
        > = {};
        for (const attempt of attempts) {
            const sid = attempt.student.sid;
            const score = attempt.percentage || 0;

            if (!studentMap[sid]) {
                studentMap[sid] = {
                    studentName: attempt.student.name || sid,
                    totalAttempts: 0,
                    totalScore: 0,
                    highestScore: score,
                    lowestScore: score,
                };
            }

            const entry = studentMap[sid];
            entry.totalAttempts += 1;
            entry.totalScore += score;
            entry.highestScore = Math.max(entry.highestScore, score);
            entry.lowestScore = Math.min(entry.lowestScore, score);
        }

        const studentSummary = Object.values(studentMap).map((student) => ({
            studentName: student.studentName,
            totalAttempts: student.totalAttempts,
            averageScore: Number((student.totalScore / student.totalAttempts).toFixed(2)),
            highestScore: Number(student.highestScore.toFixed(2)),
            lowestScore: Number(student.lowestScore.toFixed(2)),
        }));

        const quizSummaryMap: Record<
            string,
            {
                quizName: string;
                totalAttempts: number;
                totalScore: number;
                highestScore: number;
                lowestScore: number;
                passCount: number;
            }
        > = {};

        for (const attempt of attempts) {
            const currentQuizId = attempt.quiz_id || 'unknown_quiz';
            const score = attempt.percentage || 0;

            if (!quizSummaryMap[currentQuizId]) {
                quizSummaryMap[currentQuizId] = {
                    quizName: attempt.quiz?.name || currentQuizId,
                    totalAttempts: 0,
                    totalScore: 0,
                    highestScore: score,
                    lowestScore: score,
                    passCount: 0,
                };
            }

            const summary = quizSummaryMap[currentQuizId];
            summary.totalAttempts += 1;
            summary.totalScore += score;
            summary.highestScore = Math.max(summary.highestScore, score);
            summary.lowestScore = Math.min(summary.lowestScore, score);
            if (score >= 50) {
                summary.passCount += 1;
            }
        }

        const quizSummaryRows = Object.values(quizSummaryMap)
            .map((summary) => ({
                quizName: summary.quizName,
                totalAttempts: summary.totalAttempts,
                averageScore: Number((summary.totalScore / summary.totalAttempts).toFixed(2)),
                highestScore: Number(summary.highestScore.toFixed(2)),
                lowestScore: Number(summary.lowestScore.toFixed(2)),
                passRate: `${((summary.passCount / summary.totalAttempts) * 100).toFixed(1)}%`,
            }))
            .sort((a, b) => a.quizName.localeCompare(b.quizName));

        return [
            flattenJsonToTable(`class ${classId}: Quiz overview`, quizSummaryRows),
            flattenJsonToTable('ClassOverviewScope', {
                quizId: quizId || null,
                totalAttempts,
                totalStudents: uniqueStudents.size,
                totalQuizzes: quizSummaryRows.length,
            }),
            flattenJsonToTable('StudentPerformance', studentSummary),
        ].join('\n');
    }

    private async executeClassFiles(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as ClassFilesParams;
        const classId = this.toRequiredString(params.classId, 'classId');

        const classRecord = await this.prisma.class.findUnique({
            where: { clid: classId },
            select: {
                clid: true,
                files: {
                    select: {
                        fid: true,
                        filename: true,
                        original_name: true,
                    },
                    orderBy: {
                        created_at: 'desc',
                    },
                },
            },
        });

        if (!classRecord) {
            throw new Error(`Class not found: ${classId}`);
        }

        const rows = classRecord.files.map((file) => ({
            fileId: file.fid,
            fileName: file.original_name || file.filename,
        }));

        return flattenJsonToTable(`class ${classId}: Files`, rows);
    }

    private async executeClassQuizzes(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as ClassQuizzesParams;
        const classId = this.toRequiredString(params.classId, 'classId');

        const classRecord = await this.prisma.class.findUnique({
            where: { clid: classId },
            select: {
                clid: true,
                quizzes: {
                    select: {
                        qid: true,
                        name: true,
                    },
                    orderBy: {
                        created_at: 'desc',
                    },
                },
            },
        });

        if (!classRecord) {
            throw new Error(`Class not found: ${classId}`);
        }

        const rows = classRecord.quizzes.map((quiz) => ({
            quizId: quiz.qid,
            quizName: quiz.name,
        }));

        return flattenJsonToTable(`class ${classId}: Quizzes`, rows);
    }

    private async executeClassStudents(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as ClassStudentsParams;
        const classId = this.toRequiredString(params.classId, 'classId');

        const classRecord = await this.prisma.class.findUnique({
            where: { clid: classId },
            select: {
                clid: true,
                students: {
                    select: {
                        sid: true,
                        name: true,
                    },
                    orderBy: {
                        name: 'asc',
                    },
                },
            },
        });

        if (!classRecord) {
            throw new Error(`Class not found: ${classId}`);
        }

        const rows = classRecord.students.map((student) => ({
            studentId: student.sid,
            studentName: student.name,
        }));

        return flattenJsonToTable(`class ${classId}: Students`, rows);
    }

    private async executeClassLecturer(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as ClassLecturerParams;
        const classId = this.toRequiredString(params.classId, 'classId');

        const classRecord = await this.prisma.class.findUnique({
            where: { clid: classId },
            select: {
                clid: true,
                lecturer: {
                    select: {
                        lid: true,
                        name: true,
                    },
                },
            },
        });

        if (!classRecord) {
            throw new Error(`Class not found: ${classId}`);
        }

        const rows = classRecord.lecturer
            ? [{ lecturerId: classRecord.lecturer.lid, lecturerName: classRecord.lecturer.name }]
            : [];

        return flattenJsonToTable(`class ${classId}: Lecturer`, rows);
    }

    private async executeAnalyseQuizPerformance(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as QueryStudentParams;
        const classId = this.toRequiredString(params.classId, 'classId');
        const quizId = typeof params.quizId === 'string' ? params.quizId.trim() : '';
        const take = Math.min(this.toSafeNumber(params.take, 10), 100);
        const threshold =
            params.threshold === undefined || params.threshold === null
                ? null
                : Number(params.threshold);
        const comparison = typeof params.comparison === 'string'
            ? params.comparison.trim().toLowerCase()
            : '';

        const where: any = {
            student: { classes: { some: { clid: classId } } },
            quiz: { class_id: classId },
        };

        if (quizId) {
            where.quiz_id = quizId;
        }

        const attempts = await this.prisma.attempt.findMany({
            where,
            select: {
                percentage: true,
                student: { select: { sid: true, name: true } },
            },
        });

        const studentMap: Record<string, { studentName: string; totalScore: number; totalAttempts: number }> = {};
        for (const attempt of attempts) {
            const sid = attempt.student.sid;
            if (!studentMap[sid]) {
                studentMap[sid] = {
                    studentName: attempt.student.name || sid,
                    totalScore: 0,
                    totalAttempts: 0,
                };
            }

            studentMap[sid].totalScore += attempt.percentage || 0;
            studentMap[sid].totalAttempts += 1;
        }

        const studentAverages = Object.values(studentMap)
            .map((student) => ({
                studentName: student.studentName,
                averageScore: Number((student.totalScore / student.totalAttempts).toFixed(2)),
                totalAttempts: student.totalAttempts,
            }));

        const filteredStudents = studentAverages.filter((student) => {
            if (threshold === null || !Number.isFinite(threshold)) {
                return true;
            }

            switch (comparison) {
                case 'gt':
                    return student.averageScore > threshold;
                case 'gte':
                    return student.averageScore >= threshold;
                case 'lt':
                    return student.averageScore < threshold;
                case 'lte':
                    return student.averageScore <= threshold;
                default:
                    return true;
            }
        });

        const shouldSortAscending = comparison === 'lt' || comparison === 'lte';
        const sortedStudents = filteredStudents.sort((a, b) =>
            shouldSortAscending
                ? a.averageScore - b.averageScore
                : b.averageScore - a.averageScore,
        );
        const selectedStudents = sortedStudents.slice(0, take);

        return [
            flattenJsonToTable('StudentQueryScope', {
                classId,
                quizId: quizId || null,
                take,
                threshold,
                comparison: comparison || null,
                matchedStudents: filteredStudents.length,
            }),
            flattenJsonToTable('QueriedStudents', selectedStudents),
        ].join('\n');
    }

    private async executeTeachingRecommendation(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as TeachingRecommendationParams;
        const classId = this.toRequiredString(params.classId, 'classId');

        const attempts = await this.prisma.attempt.findMany({
            where: {
                student: { classes: { some: { clid: classId } } },
                quiz: { class_id: classId },
            },
            select: {
                submitted_at: true,
                started_at: true,
            },
        });

        const monthlyStats: Record<string, number> = {};
        for (const attempt of attempts) {
            const date = new Date(attempt.submitted_at || attempt.started_at || new Date());
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyStats[month] = (monthlyStats[month] || 0) + 1;
        }

        const trendRows = Object.entries(monthlyStats)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, submissions]) => ({
                month,
                submissions,
            }));

        return [
            flattenJsonToTable('TeachingRecommendationScope', {
                classId,
                totalAttempts: attempts.length,
                trackedMonths: trendRows.length,
            }),
            flattenJsonToTable('MonthlyCompletionTrend', trendRows),
        ].join('\n');
    }

    private async executeKnowledgeGap(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as KnowledgeGapParams;
        const classId = this.toRequiredString(params.classId, 'classId');
        const quizId = typeof params.quizId === 'string' ? params.quizId.trim() : '';

        const where: any = {
            attempt: {
                student: { classes: { some: { clid: classId } } },
            },
        };

        if (quizId) {
            where.attempt.quiz_id = quizId;
        }

        const answers = await this.prisma.answer.findMany({
            where,
            include: {
                question: true,
            },
        });

        const questionStats: Record<
            string,
            {
                questionId: string;
                question: string;
                totalAnswers: number;
                correctAnswers: number;
                topWrongAnswer: string;
                topWrongCount: number;
            }
        > = {};
        const wrongAnswerCounts: Record<string, Record<string, number>> = {};

        for (const answer of answers) {
            const questionId = answer.question_id || 'unknown_question';
            if (!questionStats[questionId]) {
                questionStats[questionId] = {
                    questionId,
                    question: answer.question?.content || `Question ID: ${questionId}`,
                    totalAnswers: 0,
                    correctAnswers: 0,
                    topWrongAnswer: '',
                    topWrongCount: 0,
                };
            }

            if (!wrongAnswerCounts[questionId]) {
                wrongAnswerCounts[questionId] = {};
            }

            const stats = questionStats[questionId];
            stats.totalAnswers += 1;

            if (answer.is_correct) {
                stats.correctAnswers += 1;
                continue;
            }

            let wrongAnswer = 'Unknown';
            if (answer.answer_json) {
                try {
                    const parsed =
                        typeof answer.answer_json === 'string'
                            ? JSON.parse(answer.answer_json)
                            : answer.answer_json;
                    wrongAnswer =
                        parsed.selected || parsed.answer || JSON.stringify(parsed);
                } catch {
                    wrongAnswer = String(answer.answer_json);
                }
            }

            wrongAnswerCounts[questionId][wrongAnswer] =
                (wrongAnswerCounts[questionId][wrongAnswer] || 0) + 1;

            if (wrongAnswerCounts[questionId][wrongAnswer] > stats.topWrongCount) {
                stats.topWrongCount = wrongAnswerCounts[questionId][wrongAnswer];
                stats.topWrongAnswer = wrongAnswer;
            }
        }

        const rows = Object.values(questionStats).map((row) => ({
                questionId: row.questionId,
                question: row.question,
                totalAnswers: row.totalAnswers,
                passRate:
                    row.totalAnswers > 0
                        ? `${((row.correctAnswers / row.totalAnswers) * 100).toFixed(1)}%`
                        : '0%',
                topWrongAnswer: row.topWrongAnswer || 'None',
                topWrongCount: row.topWrongCount,
            }));

        return [
            flattenJsonToTable('KnowledgeGapScope', {
                classId,
                quizId: quizId || null,
                totalAnswers: answers.length,
                totalQuestions: rows.length,
            }),
            flattenJsonToTable('KnowledgeGapByQuestion', rows),
        ].join('\n');
    }

    async execute(
        steps: ExecutionAction[],
    ): Promise<Array<ExecutionContext>> {
        return Promise.all(
            steps.map(async (step) => {
                const capabilityId =
                    step.capabilityId ||
                    (step as unknown as { id?: string }).id ||
                    '';

                //No need further validation
                // if (!capabilityId) {
                //     return {
                //         capabilityId: 'undefined',
                //         error: 'Missing capability ID',
                //     };
                // }

                const handler = this.handlers[capabilityId];
                if (!handler) {
                    return {
                        capabilityId,
                        error: `Unknown capability ID: ${capabilityId}`,
                    };
                }

                try {
                    const result = await handler(step);
                    return { capabilityId, result };
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    return {
                        capabilityId,
                        error: message,
                    };
                }
            }),
        );
    }

    
}
