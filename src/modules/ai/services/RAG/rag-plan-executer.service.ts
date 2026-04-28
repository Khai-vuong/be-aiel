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

type StudentQuizHistoryParams = {
    classId?: string;
    studentId?: string;
};

type ClassEngagementParams = {
    classId?: string;
    days_inactive?: number;
};

type AtRiskStudentsParams = {
    classId?: string;
    score_threshold?: number;
    inactive_days?: number;
};

type SubmissionSummaryParams = {
    classId?: string;
    quizId?: string;
};

type ClassAnnouncementsParams = {
    classId?: string;
    limit?: number;
    offset?: number;
};

type MultiClassComparisonParams = {
    classIds?: string | string[];
    metric?: string;
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
        'student-quiz-history': (step) => this.executeStudentQuizHistory(step),
        'class-engagement': (step) => this.executeClassEngagement(step),
        'at-risk-students': (step) => this.executeAtRiskStudents(step),
        'submission-summary': (step) => this.executeSubmissionSummary(step),
        'class-announcements': (step) => this.executeClassAnnouncements(step),
        'multi-class-comparison': (step) => this.executeMultiClassComparison(step),
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

    private async getClassContext(classId: string) {
        const classRecord = await this.prisma.class.findUnique({
            where: { clid: classId },
            select: {
                clid: true,
                name: true,
                students: {
                    select: {
                        sid: true,
                        name: true,
                        user_id: true,
                        user: {
                            select: {
                                uid: true,
                                username: true,
                                role: true,
                            },
                        },
                    },
                },
                lecturer: {
                    select: {
                        lid: true,
                        name: true,
                        user: {
                            select: {
                                uid: true,
                                username: true,
                                role: true,
                            },
                        },
                    },
                },
                quizzes: {
                    select: {
                        qid: true,
                        name: true,
                        available_until: true,
                    },
                },
            },
        });

        if (!classRecord) {
            throw new Error(`Class not found: ${classId}`);
        }

        return classRecord;
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

    private async executeStudentQuizHistory(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as StudentQuizHistoryParams;
        const classId = this.toRequiredString(params.classId, 'classId');
        const studentId = this.toRequiredString(params.studentId, 'studentId');

        const classRecord = await this.getClassContext(classId);
        const studentInClass = classRecord.students.find((student) => student.sid === studentId);

        if (!studentInClass) {
            throw new Error(`Student not found in class: ${studentId}`);
        }

        const attempts = await this.prisma.attempt.findMany({
            where: {
                student_id: studentId,
                quiz: {
                    class_id: classId,
                },
            },
            select: {
                quiz_id: true,
                percentage: true,
                score: true,
                status: true,
                attempt_number: true,
                submitted_at: true,
                started_at: true,
                quiz: {
                    select: {
                        qid: true,
                        name: true,
                    },
                },
            },
            orderBy: [
                { quiz_id: 'asc' },
                { attempt_number: 'asc' },
            ],
        });

        const historyMap = new Map<
            string,
            {
                quizId: string;
                quizName: string;
                attemptScores: number[];
                totalAttempts: number;
                totalScore: number;
                latestScore: number;
                latestStatus: string;
                latestAttemptNumber: number;
                latestAttemptAt: Date | null;
            }
        >();

        for (const attempt of attempts) {
            const quizIdKey = attempt.quiz_id;
            const scoreValue = attempt.percentage ?? attempt.score ?? 0;

            if (!historyMap.has(quizIdKey)) {
                historyMap.set(quizIdKey, {
                    quizId: quizIdKey,
                    quizName: attempt.quiz?.name || quizIdKey,
                    attemptScores: [],
                    totalAttempts: 0,
                    totalScore: 0,
                    latestScore: scoreValue,
                    latestStatus: attempt.status,
                    latestAttemptNumber: attempt.attempt_number,
                    latestAttemptAt: attempt.submitted_at || attempt.started_at || null,
                });
            }

            const entry = historyMap.get(quizIdKey)!;
            entry.attemptScores.push(scoreValue);
            entry.totalAttempts += 1;
            entry.totalScore += scoreValue;

            if (attempt.attempt_number >= entry.latestAttemptNumber) {
                entry.latestScore = scoreValue;
                entry.latestStatus = attempt.status;
                entry.latestAttemptNumber = attempt.attempt_number;
                entry.latestAttemptAt = attempt.submitted_at || attempt.started_at || null;
            }
        }

        const rows = Array.from(historyMap.values())
            .map((entry) => ({
                quizId: entry.quizId,
                quizName: entry.quizName,
                attemptScores: entry.attemptScores.join(', '),
                totalAttempts: entry.totalAttempts,
                averageScore: Number((entry.totalScore / entry.totalAttempts).toFixed(2)),
                latestScore: Number(entry.latestScore.toFixed(2)),
                latestStatus: entry.latestStatus,
                latestAttemptAt: entry.latestAttemptAt ? entry.latestAttemptAt.toISOString() : null,
                latestPassStatus: entry.latestScore >= 50 ? 'Passed' : 'Not passed',
            }))
            .sort((a, b) => a.quizName.localeCompare(b.quizName));

        return [
            flattenJsonToTable('StudentQuizHistoryScope', {
                classId,
                studentId,
                studentName: studentInClass.name,
                totalQuizzes: rows.length,
                totalAttempts: attempts.length,
            }),
            flattenJsonToTable('StudentQuizHistory', rows),
        ].join('\n');
    }

    private async executeClassEngagement(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as ClassEngagementParams;
        const classId = this.toRequiredString(params.classId, 'classId');
        const daysInactive = params.days_inactive === undefined || params.days_inactive === null
            ? null
            : this.toSafeNumber(params.days_inactive, 14);

        const classRecord = await this.getClassContext(classId);
        const userIds = classRecord.students.map((student) => student.user_id);
        const now = new Date();

        const logs = userIds.length === 0
            ? []
            : await this.prisma.log.findMany({
                where: {
                    user_id: { in: userIds },
                },
                select: {
                    user_id: true,
                    action: true,
                    created_at: true,
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

        const metricsByUser = new Map<
            string,
            {
                lastLoginAt: Date | null;
                totalSessions: number;
                weeklyActivityCount: number;
                monthlyActivityCount: number;
            }
        >();

        for (const userId of userIds) {
            metricsByUser.set(userId, {
                lastLoginAt: null,
                totalSessions: 0,
                weeklyActivityCount: 0,
                monthlyActivityCount: 0,
            });
        }

        for (const log of logs) {
            const metric = metricsByUser.get(log.user_id);
            if (!metric) {
                continue;
            }

            const ageInMs = now.getTime() - log.created_at.getTime();
            const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

            if (log.action === 'login') {
                metric.totalSessions += 1;
                if (!metric.lastLoginAt) {
                    metric.lastLoginAt = log.created_at;
                }
            }

            if (ageInDays <= 7) {
                metric.weeklyActivityCount += 1;
            }

            if (ageInDays <= 30) {
                metric.monthlyActivityCount += 1;
            }
        }

        const rows = classRecord.students
            .map((student) => {
                const metric = metricsByUser.get(student.user_id) ?? {
                    lastLoginAt: null,
                    totalSessions: 0,
                    weeklyActivityCount: 0,
                    monthlyActivityCount: 0,
                };

                const daysSinceLastLogin = metric.lastLoginAt
                    ? Math.floor((now.getTime() - metric.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                if (daysInactive !== null) {
                    if (daysSinceLastLogin !== null && daysSinceLastLogin < daysInactive) {
                        return null;
                    }
                }

                return {
                    studentId: student.sid,
                    studentName: student.name,
                    lastLoginAt: metric.lastLoginAt ? metric.lastLoginAt.toISOString() : null,
                    daysSinceLastLogin,
                    totalSessions: metric.totalSessions,
                    weeklyActivityCount: metric.weeklyActivityCount,
                    monthlyActivityCount: metric.monthlyActivityCount,
                };
            })
            .filter((row): row is NonNullable<typeof row> => row !== null)
            .sort((a, b) => {
                const aValue = a.daysSinceLastLogin ?? Number.POSITIVE_INFINITY;
                const bValue = b.daysSinceLastLogin ?? Number.POSITIVE_INFINITY;
                return aValue - bValue;
            });

        return [
            flattenJsonToTable('ClassEngagementScope', {
                classId,
                className: classRecord.name,
                totalStudents: classRecord.students.length,
                trackedStudents: rows.length,
                daysInactive,
            }),
            flattenJsonToTable('ClassEngagement', rows),
        ].join('\n');
    }

    private async executeAtRiskStudents(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as AtRiskStudentsParams;
        const classId = this.toRequiredString(params.classId, 'classId');
        const scoreThreshold = params.score_threshold === undefined || params.score_threshold === null
            ? 50
            : Number(params.score_threshold);
        const inactiveDays = params.inactive_days === undefined || params.inactive_days === null
            ? 14
            : this.toSafeNumber(params.inactive_days, 14);

        const classRecord = await this.getClassContext(classId);
        const userIds = classRecord.students.map((student) => student.user_id);
        const now = new Date();

        const attempts = userIds.length === 0
            ? []
            : await this.prisma.attempt.findMany({
                where: {
                    student_id: { in: classRecord.students.map((student) => student.sid) },
                    quiz: {
                        class_id: classId,
                    },
                },
                select: {
                    student_id: true,
                    quiz_id: true,
                    percentage: true,
                    score: true,
                },
            });

        const loginLogs = userIds.length === 0
            ? []
            : await this.prisma.log.findMany({
                where: {
                    user_id: { in: userIds },
                    action: 'login',
                },
                select: {
                    user_id: true,
                    created_at: true,
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

        const latestLoginByUser = new Map<string, Date | null>();
        for (const userId of userIds) {
            latestLoginByUser.set(userId, null);
        }
        for (const log of loginLogs) {
            if (!latestLoginByUser.get(log.user_id)) {
                latestLoginByUser.set(log.user_id, log.created_at);
            }
        }

        const studentMetrics = new Map<
            string,
            {
                studentId: string;
                studentName: string;
                totalScore: number;
                totalAttempts: number;
                attemptedQuizzes: Set<string>;
                lastLoginAt: Date | null;
            }
        >();

        for (const student of classRecord.students) {
            studentMetrics.set(student.sid, {
                studentId: student.sid,
                studentName: student.name,
                totalScore: 0,
                totalAttempts: 0,
                attemptedQuizzes: new Set<string>(),
                lastLoginAt: latestLoginByUser.get(student.user_id) ?? null,
            });
        }

        for (const attempt of attempts) {
            const metric = studentMetrics.get(attempt.student_id);
            if (!metric) {
                continue;
            }

            const scoreValue = attempt.percentage ?? attempt.score ?? 0;
            metric.totalScore += scoreValue;
            metric.totalAttempts += 1;
            metric.attemptedQuizzes.add(attempt.quiz_id);
        }

        const rows = Array.from(studentMetrics.values())
            .map((metric) => {
                const averageQuizScore = metric.totalAttempts > 0
                    ? metric.totalScore / metric.totalAttempts
                    : 0;
                const daysSinceLastLogin = metric.lastLoginAt
                    ? Math.floor((now.getTime() - metric.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                const missingQuizCount = Math.max(classRecord.quizzes.length - metric.attemptedQuizzes.size, 0);
                const scoreGap = Math.max(scoreThreshold - averageQuizScore, 0);
                const scoreRisk = scoreThreshold > 0 ? (scoreGap / scoreThreshold) * 45 : 0;
                const inactivityRisk = daysSinceLastLogin === null
                    ? 20
                    : daysSinceLastLogin > inactiveDays
                        ? Math.min(35, ((daysSinceLastLogin - inactiveDays) / Math.max(inactiveDays, 1)) * 10 + 10)
                        : 0;
                const missingRisk = Math.min(25, missingQuizCount * 5);
                const riskScore = Math.min(100, Number((scoreRisk + inactivityRisk + missingRisk).toFixed(2)));

                return {
                    studentId: metric.studentId,
                    studentName: metric.studentName,
                    averageQuizScore: Number(averageQuizScore.toFixed(2)),
                    daysSinceLastLogin,
                    missingQuizCount,
                    totalAttempts: metric.totalAttempts,
                    lastLoginAt: metric.lastLoginAt ? metric.lastLoginAt.toISOString() : null,
                    riskScore,
                    riskLevel: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
                };
            })
            .sort((a, b) => b.riskScore - a.riskScore);

        return [
            flattenJsonToTable('AtRiskStudentsScope', {
                classId,
                className: classRecord.name,
                scoreThreshold,
                inactiveDays,
                totalStudents: classRecord.students.length,
            }),
            flattenJsonToTable('AtRiskStudents', rows),
        ].join('\n');
    }

    private async executeSubmissionSummary(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as SubmissionSummaryParams;
        const classId = this.toRequiredString(params.classId, 'classId');
        const quizId = typeof params.quizId === 'string' ? params.quizId.trim() : '';

        const classRecord = await this.getClassContext(classId);
        const quizzesInScope = quizId
            ? classRecord.quizzes.filter((quiz) => quiz.qid === quizId)
            : classRecord.quizzes;

        const attempts = await this.prisma.attempt.findMany({
            where: {
                quiz: {
                    class_id: classId,
                },
                ...(quizId ? { quiz_id: quizId } : {}),
            },
            select: {
                student_id: true,
                quiz_id: true,
                attempt_number: true,
                status: true,
                submitted_at: true,
                quiz: {
                    select: {
                        qid: true,
                        name: true,
                        available_until: true,
                    },
                },
            },
            orderBy: [
                { quiz_id: 'asc' },
                { student_id: 'asc' },
                { attempt_number: 'desc' },
            ],
        });

        const latestAttemptByStudentQuiz = new Map<
            string,
            {
                studentId: string;
                quizId: string;
                quizName: string;
                status: string;
                submittedAt: Date | null;
                availableUntil: Date | null;
            }
        >();

        for (const attempt of attempts) {
            const key = `${attempt.quiz_id}:${attempt.student_id}`;
            if (latestAttemptByStudentQuiz.has(key)) {
                continue;
            }

            latestAttemptByStudentQuiz.set(key, {
                studentId: attempt.student_id,
                quizId: attempt.quiz_id,
                quizName: attempt.quiz?.name || attempt.quiz_id,
                status: attempt.status,
                submittedAt: attempt.submitted_at ?? null,
                availableUntil: attempt.quiz?.available_until ?? null,
            });
        }

        const rows = quizzesInScope
            .map((quiz) => {
                const quizLatestAttempts = Array.from(latestAttemptByStudentQuiz.values()).filter(
                    (attempt) => attempt.quizId === quiz.qid,
                );
                const submittedStudents = quizLatestAttempts.filter(
                    (attempt) => attempt.status === 'submitted' || attempt.status === 'graded' || attempt.submittedAt !== null,
                );
                const lateCount = quizLatestAttempts.filter(
                    (attempt) => attempt.submittedAt !== null && attempt.availableUntil !== null && attempt.submittedAt > attempt.availableUntil,
                ).length;
                const submittedCount = submittedStudents.length;
                const missingCount = Math.max(classRecord.students.length - submittedCount, 0);

                return {
                    quizId: quiz.qid,
                    quizName: quiz.name,
                    totalStudents: classRecord.students.length,
                    submittedCount,
                    missingCount,
                    lateCount,
                    completionRate: classRecord.students.length > 0
                        ? `${((submittedCount / classRecord.students.length) * 100).toFixed(1)}%`
                        : '0.0%',
                };
            })
            .sort((a, b) => a.quizName.localeCompare(b.quizName));

        return [
            flattenJsonToTable('SubmissionSummaryScope', {
                classId,
                quizId: quizId || null,
                totalStudents: classRecord.students.length,
                totalQuizzes: quizzesInScope.length,
            }),
            flattenJsonToTable('SubmissionSummary', rows),
        ].join('\n');
    }

    private async executeClassAnnouncements(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as ClassAnnouncementsParams;
        const classId = this.toRequiredString(params.classId, 'classId');
        const limit = Math.min(this.toSafeNumber(params.limit, 50), 200);
        const offset = this.toSafeNumber(params.offset, 0);

        const notifications = await this.prisma.notification.findMany({
            where: {
                related_type: 'Class',
                related_id: classId,
            },
            select: {
                nid: true,
                title: true,
                message: true,
                type: true,
                is_read: true,
                related_type: true,
                related_id: true,
                created_at: true,
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        const announceLogs = await this.prisma.log.findMany({
            where: {
                action: 'notify_class',
                resource_type: 'Class',
                resource_id: classId,
            },
            select: {
                user: {
                    select: {
                        uid: true,
                        username: true,
                        role: true,
                    },
                },
                created_at: true,
            },
            orderBy: {
                created_at: 'desc',
            },
            take: 1,
        });

        const sender = announceLogs[0]?.user ?? null;
        const groupedAnnouncements = new Map<
            string,
            {
                title: string;
                message: string;
                type: string;
                relatedType: string | null;
                relatedId: string | null;
                sentAt: Date;
                lastSentAt: Date;
                recipientCount: number;
                readReceiptCount: number;
            }
        >();

        for (const notification of notifications) {
            const key = [
                notification.title,
                notification.message,
                notification.type,
                notification.related_type || '',
                notification.related_id || '',
            ].join('||');

            if (!groupedAnnouncements.has(key)) {
                groupedAnnouncements.set(key, {
                    title: notification.title,
                    message: notification.message,
                    type: notification.type,
                    relatedType: notification.related_type,
                    relatedId: notification.related_id,
                    sentAt: notification.created_at,
                    lastSentAt: notification.created_at,
                    recipientCount: 0,
                    readReceiptCount: 0,
                });
            }

            const entry = groupedAnnouncements.get(key)!;
            entry.recipientCount += 1;
            if (notification.is_read) {
                entry.readReceiptCount += 1;
            }
            if (notification.created_at < entry.sentAt) {
                entry.sentAt = notification.created_at;
            }
            if (notification.created_at > entry.lastSentAt) {
                entry.lastSentAt = notification.created_at;
            }
        }

        const rows = Array.from(groupedAnnouncements.values())
            .map((announcement) => ({
                title: announcement.title,
                message: announcement.message,
                notificationType: announcement.type,
                relatedType: announcement.relatedType,
                relatedId: announcement.relatedId,
                senderUid: sender?.uid ?? null,
                senderName: sender?.username ?? null,
                sentAt: announcement.sentAt.toISOString(),
                lastSentAt: announcement.lastSentAt.toISOString(),
                recipientCount: announcement.recipientCount,
                readReceiptCount: announcement.readReceiptCount,
            }))
            .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
            .slice(offset, offset + limit);

        return [
            flattenJsonToTable('ClassAnnouncementsScope', {
                classId,
                totalNotifications: notifications.length,
                totalAnnouncements: groupedAnnouncements.size,
                senderUid: sender?.uid ?? null,
            }),
            flattenJsonToTable('ClassAnnouncements', rows),
        ].join('\n');
    }

    private async executeMultiClassComparison(step: ExecutionAction): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as MultiClassComparisonParams;
        const classIdsRaw = params.classIds ?? [];
        const classIds = Array.isArray(classIdsRaw)
            ? classIdsRaw.map((value) => String(value).trim()).filter(Boolean)
            : String(classIdsRaw)
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean);
        const metric = typeof params.metric === 'string' ? params.metric.trim().toLowerCase() : 'score';

        if (classIds.length === 0) {
            throw new Error('Missing required parameter: classIds');
        }

        const rows = [] as Array<{
            classId: string;
            className: string;
            totalStudents: number;
            totalQuizzes: number;
            averageScore: number;
            passRate: number;
            quizCompletionRate: number;
            engagementScore: number;
        }>;

        for (const classId of classIds) {
            const classRecord = await this.getClassContext(classId);
            const userIds = classRecord.students.map((student) => student.user_id);

            const attempts = await this.prisma.attempt.findMany({
                where: {
                    student_id: {
                        in: classRecord.students.map((student) => student.sid),
                    },
                    quiz: {
                        class_id: classId,
                    },
                },
                select: {
                    student_id: true,
                    quiz_id: true,
                    percentage: true,
                    score: true,
                    status: true,
                    attempt_number: true,
                    submitted_at: true,
                    quiz: {
                        select: {
                            qid: true,
                            available_until: true,
                        },
                    },
                },
            });

            const loginLogs = userIds.length === 0
                ? []
                : await this.prisma.log.findMany({
                    where: {
                        user_id: { in: userIds },
                        action: 'login',
                    },
                    select: {
                        user_id: true,
                        created_at: true,
                    },
                });

            const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.percentage ?? attempt.score ?? 0), 0);
            const averageScore = attempts.length > 0 ? totalScore / attempts.length : 0;
            const passRate = attempts.length > 0
                ? (attempts.filter((attempt) => (attempt.percentage ?? attempt.score ?? 0) >= 50).length / attempts.length) * 100
                : 0;

            const latestAttemptByStudentQuiz = new Set<string>();
            for (const attempt of attempts.sort((a, b) => {
                if (a.quiz_id === b.quiz_id) {
                    return b.attempt_number - a.attempt_number;
                }
                return a.quiz_id.localeCompare(b.quiz_id);
            })) {
                const key = `${attempt.quiz_id}:${attempt.student_id}`;
                if (!latestAttemptByStudentQuiz.has(key)) {
                    latestAttemptByStudentQuiz.add(key);
                }
            }

            const quizCompletionRate = classRecord.students.length > 0 && classRecord.quizzes.length > 0
                ? (latestAttemptByStudentQuiz.size / (classRecord.students.length * classRecord.quizzes.length)) * 100
                : 0;

            const engagementScore = classRecord.students.length > 0
                ? loginLogs.length / classRecord.students.length
                : 0;

            rows.push({
                classId,
                className: classRecord.name,
                totalStudents: classRecord.students.length,
                totalQuizzes: classRecord.quizzes.length,
                averageScore: Number(averageScore.toFixed(2)),
                passRate: Number(passRate.toFixed(1)),
                quizCompletionRate: Number(quizCompletionRate.toFixed(1)),
                engagementScore: Number(engagementScore.toFixed(2)),
            });
        }

        const sortField = metric === 'pass_rate'
            ? 'passRate'
            : metric === 'completion'
                ? 'quizCompletionRate'
                : metric === 'engagement'
                    ? 'engagementScore'
                    : 'averageScore';

        rows.sort((a, b) => (b as any)[sortField] - (a as any)[sortField]);

        return [
            flattenJsonToTable('MultiClassComparisonScope', {
                classIds: classIds.join(', '),
                metric,
                totalClasses: rows.length,
            }),
            flattenJsonToTable('MultiClassComparison', rows),
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
