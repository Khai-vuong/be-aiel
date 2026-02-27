import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Attempt } from '@prisma/client';
import { CreateAttemptDto, SubmitAttemptDto, UpdateAttemptDto, CreateAnswerDto } from './attempts.dto';
import { LogService } from '../logs';
import { JwtPayload } from '../users/jwt.strategy';

/**
 * AttemptsService
 * 
 * Manages quiz attempt operations including creation, submission, and retrieval.
 * 
 * Public Methods:
 * - create(createData: CreateAttemptDto): Promise<Attempt>
 *     Creates a new attempt for a student taking a quiz
 *     Validates that quiz and student exist, and checks max attempts allowed
 * 
 * - submit(attemptId: string, submitData: SubmitAttemptDto): Promise<Attempt>
 *     Submits an attempt with all answers, marking it as submitted
 *     Validates that attempt exists and is still in_progress
 * 
 * - findByQuizId(quizId: string): Promise<Attempt[]>
 *     Retrieves all attempts for a specific quiz
 * 
 * - findByQuizAndStudent(quizId: string, studentId: string): Promise<Attempt[]>
 *     Retrieves all attempts for a specific student in a specific quiz
 * 
 * - findOne(attemptId: string): Promise<Attempt>
 *     Retrieves detailed information about a single attempt including answers
 * 
 * - update(attemptId: string, updateData: UpdateAttemptDto): Promise<Attempt>
 *     Updates attempt information (typically used for grading)
 */

@Injectable()
export class AttemptsService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly logService: LogService,
    ) { }

    // Create a new attempt
    async create(user: JwtPayload, createData: CreateAttemptDto): Promise<Attempt> {
        // Check if quiz and student exists
        const quizExists = this.prisma.quiz.findUnique({
            where: { qid: createData.quiz_id }
        });
        const studentExists = this.prisma.student.findUnique({
            where: { sid: createData.student_id }
        });

        const [quiz, student] = await Promise.all([quizExists, studentExists]);

        if (!quiz) {
            throw new NotFoundException(`Quiz with ID ${createData.quiz_id} not found`);
        }

        if (!student) {
            throw new NotFoundException(`Student with ID ${createData.student_id} not found`);
        }

        // Check max attempts allowed (if settings specify it)
        const maxAttemptsAllowed = quiz.settings_json
            ? JSON.parse(quiz.settings_json).maxAttempts || -1
            : -1;

        let NumOfExistingAttempts = 0;
        if (maxAttemptsAllowed > 0) {
                NumOfExistingAttempts = await this.prisma.attempt.count({
                where: {
                    quiz_id: createData.quiz_id,
                    student_id: createData.student_id
                }
            });

            if (NumOfExistingAttempts >= maxAttemptsAllowed) {
                throw new BadRequestException(
                    `Student has reached maximum allowed attempts (${maxAttemptsAllowed}) for this quiz`
                );
            }
        }

        const thisAttemptNumber = NumOfExistingAttempts + 1;

        // Create the attempt
        const newAttempt = await this.prisma.attempt.create({
            data: {
                quiz_id: createData.quiz_id,
                student_id: createData.student_id,
                attempt_number: thisAttemptNumber,
                status: 'in_progress',
                started_at: new Date()
            },
            include: {
                quiz: {
                    select: {
                        qid: true,
                        name: true
                    }
                },
                student: {
                    select: {
                        sid: true,
                        name: true
                    }
                }
            }
        });

        await this.logService.createLog('create_attempt', user.uid, 'Attempt', newAttempt.atid);
        return newAttempt;
    }

    // Submit an attempt with answers
    /**
     * Submit a quiz attempt with all of student's answers
     * 
     * Preconditions:
     * - the attempt must exists and be in 'in_progress' status
     * - all questions in the submitted answers must belong to the quiz
     * 
     * This method completes a student's quiz attempt by:
     * 1. Validating the attempt exists and is still in_progress
     * 2. Validating all submitted answers belong to the quiz
     * 3. Automatically grading each answer by comparing with the answer key
     * 4. Calculating is_correct flag and points_awarded for each answer
     * 5. Computing total score, max score, and percentage for the attempt
     * 6. Updating attempt status to 'submitted' with all calculations
     * 
     * Answer Grading Logic:
     * - Supports single answer: {"correct": "A"} vs {"selected": "A"}
     * - Supports multiple answers: {"correct": ["A", "C"]} vs {"selected": ["A", "C"]}
     * - Awards full points if answer is correct, 0 if incorrect
     * - Gracefully handles JSON parsing errors
     * 
     * Postconditions:
     * - the attempt status is updated to 'submitted'
     * - all answers are created and linked to the attempt
     * - the attempt contains the total score, max score, and percentage
     * 
     * @param attemptId - The ID of the attempt to submit
     * @param submitData - Contains array of answers with question_id and answer_json
     * @returns Promise<Attempt> - Updated attempt with submitted status, score, and all answers
     * @throws NotFoundException - If attempt or quiz not found
     * @throws BadRequestException - If attempt not in_progress or contains invalid question IDs
     */
    async submit(user: JwtPayload, attemptId: string, submitData: SubmitAttemptDto): Promise<Attempt> {
        // Check if attempt exists
        const attempt = await this.prisma.attempt.findUnique({
            where: { atid: attemptId }
        });

        if (!attempt) {
            throw new NotFoundException(`Attempt with ID ${attemptId} not found`);
        }

        // Check if attempt is still in progress
        if (attempt.status !== 'in_progress') {
            throw new BadRequestException(
                `Attempt is no longer in progress (current status: ${attempt.status})`
            );
        }

        // Validate all questions belong to the quiz
        const quiz = await this.prisma.quiz.findUnique({
            where: { qid: attempt.quiz_id },
            include: {
                questions: {
                    select: {
                        ques_id: true,
                        answer_key_json: true,
                        points: true
                    }
                }
            }
        });

        if (!quiz) {
            throw new NotFoundException(`Quiz with ID ${attempt.quiz_id} not found`);
        }

        // Validate if there's any question in the answers that does not belong to the quiz
        const validQuestionIds = quiz.questions.map(q => q.ques_id);
        const answeredQuestionIds = submitData.answers.map(a => a.question_id);

        const invalidQuestionIds = answeredQuestionIds.filter(
            qid => !validQuestionIds.includes(qid)
        );

        if (invalidQuestionIds.length > 0) {
            throw new BadRequestException(
                `Invalid question IDs: ${invalidQuestionIds.join(', ')}`
            );
        }

        // Filter questions that were answered
        const questionList = quiz.questions.filter(q => answeredQuestionIds.includes(q.ques_id));

        // Create a map for quick lookup
        const questionMap = new Map(
            questionList.map(q => [q.ques_id, q])
        );

        // Prepare answer data with is_correct and points_awarded
        const answersDataList = submitData.answers.map(answer => {
            const question = questionMap.get(answer.question_id);
            
            // Parse JSON to compare answers
            let isCorrect = false;
            let pointsAwarded = 0;

            if (question) {
                try {
                    const correctAnswer = JSON.parse(question.answer_key_json);
                    const studentAnswer = JSON.parse(answer.answer_json);

                    // Compare answers
                    // Handle both single answer {"correct": "A"} and multiple {"correct": ["A", "C"]}
                    if (Array.isArray(correctAnswer.correct) && Array.isArray(studentAnswer.selected)) {
                        // Multiple correct answers - all must match
                        isCorrect = 
                            correctAnswer.correct.length === studentAnswer.selected.length &&
                            correctAnswer.correct.every((ans: string) => studentAnswer.selected.includes(ans));
                    } else if (typeof correctAnswer.correct === 'string' && typeof studentAnswer.selected === 'string') {
                        // Single answer
                        isCorrect = correctAnswer.correct === studentAnswer.selected;
                    }

                    // Award points if correct
                    pointsAwarded = isCorrect ? question.points : 0;
                } catch (error) {
                    console.error(`Error parsing answer JSON for question ${answer.question_id}:`, error);
                    isCorrect = false;
                    pointsAwarded = 0;
                }
            }

            return {
                question_id: answer.question_id,
                answer_json: answer.answer_json,
                is_correct: isCorrect,
                points_awarded: pointsAwarded,
                student_id: attempt.student_id
            };
        });

        // Calculate total score and percentage
        const totalPoints = answersDataList.reduce((sum, ans) => sum + (ans.points_awarded || 0), 0);
        const maxPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
        const percentage = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;

        // Update attempt status to submitted and create answers
        const submittedAttempt = await this.prisma.attempt.update({
            where: { atid: attemptId },
            data: {
                status: 'submitted',
                submitted_at: new Date(),
                score: totalPoints,
                max_score: maxPoints,
                percentage: percentage,
                answers: {
                    create: answersDataList
                }
            },
            include: {
                quiz: {
                    select: {
                        qid: true,
                        name: true
                    }
                },
                student: {
                    select: {
                        sid: true,
                        name: true,
                        user_id: true
                    }
                },
                answers: {
                    select: {
                        answer_json: true,
                        is_correct: true,
                        points_awarded: true,
                        question: {
                            select: {
                                ques_id: true,
                                content: true,
                                answer_key_json: true,
                                points: true
                            }
                        }
                    }
                }
            }
        });

        await this.logService.createLog('submit_attempt', user.uid, 'Attempt', attemptId);
        return submittedAttempt;
    }

    // Get all attempts for a specific quiz
    async findByQuizId(quizId: string): Promise<Attempt[]> {
        // Check if quiz exists
        const quizExists = await this.prisma.quiz.findUnique({
            where: { qid: quizId }
        });

        if (!quizExists) {
            throw new NotFoundException(`Quiz with ID ${quizId} not found`);
        }

        return this.prisma.attempt.findMany({
            where: {
                quiz_id: quizId
            },
            include: {
                student: {
                    select: {
                        sid: true,
                        name: true
                    }
                },
                quiz: {
                    select: {
                        qid: true,
                        name: true
                    }
                },
                answers: true,
            },
            orderBy: {
                started_at: 'desc'
            }
        });
    }

    // Get all attempts for a specific student in a specific quiz
    async findByQuizAndStudent(quizId: string, studentId: string): Promise<Attempt[]> {
        // Check if quiz exists
        const quizExists =  this.prisma.quiz.findUnique({
            where: { qid: quizId }
        });

        // Check if student exists
        const studentExists =  this.prisma.student.findUnique({
            where: { sid: studentId }
        });

        const [quiz, student] = await Promise.all([quizExists, studentExists]);

        if (!quiz) {
            throw new NotFoundException(`Quiz with ID ${quizId} not found`);
        }
        if (!student) {
            throw new NotFoundException(`Student with ID ${studentId} not found`);
        }

        return this.prisma.attempt.findMany({
            where: {
                quiz_id: quizId,
                student_id: studentId
            },
            include: {
                quiz: {
                    select: {
                        qid: true,
                        name: true
                    }
                },
            },
            orderBy: {
                attempt_number: 'asc'
            }
        });
    }

    // Get a single attempt by ID
    async findOne(attemptId: string): Promise<Attempt> {
        const attempt = await this.prisma.attempt.findUnique({
            where: { atid: attemptId },
            include: {
                quiz: {
                    select: {
                        name: true,
                        settings_json: true
                    }
                },
                student: {
                    select: {
                        name: true
                    }
                },
                answers: {
                    select: {
                        answer_json: true,
                        is_correct: true,
                        points_awarded: true, 
                        question: {
                            select: {
                                content: true,
                                options_json: true,
                                answer_key_json: true,
                                points: true
                            }
                        }                       
                    },
                }
            }
        });

        if (!attempt) {
            throw new NotFoundException(`Attempt with ID ${attemptId} not found`);
        }

        return attempt;
    }

    // Update an attempt (typically for grading)
    async update(user: JwtPayload, attemptId: string, updateData: UpdateAttemptDto): Promise<Attempt> {
        const attempt = await this.prisma.attempt.findUnique({
            where: { atid: attemptId }
        });

        if (!attempt) {
            throw new NotFoundException(`Attempt with ID ${attemptId} not found`);
        }

        const percentage = updateData.score && updateData.max_score
            ? (updateData.score / updateData.max_score) * 100
            : undefined;

        const updatedData = { ...updateData, percentage };

        const updatedAttempt = await this.prisma.attempt.update({
            where: { atid: attemptId },
            data: updatedData,
            include: {
                quiz: {
                    select: {
                        qid: true,
                        name: true
                    }
                },
                student: {
                    select: {
                        sid: true,
                        name: true,
                        user_id: true
                    }
                },
            }
        });

        await this.logService.createLog('update_attempt', user.uid, 'Attempt', attemptId);
        return updatedAttempt;
    }
}
