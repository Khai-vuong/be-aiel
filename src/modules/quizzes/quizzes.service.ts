import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Quiz } from '@prisma/client';
import { CreateQuizDto, UpdateQuizDto, CreateQuestionDto } from './quizzes.dto';
import { createClient } from '@supabase/supabase-js';
import { AnswerScalarFieldEnum } from 'generated/prisma/internal/prismaNamespace';
import { LogService } from '../logs';

/**
 * QuizzesService
 * 
 * Manages quiz operations including CRUD operations and quiz retrieval by class.
 * 
 * Public Methods:
 * - findAll(): Promise<Quiz[]>
 *     Retrieves all quizzes with class information and attempt counts
 * 
 * - findOne(id: string): Promise<Quiz>
 *     Retrieves a single quiz by ID with full details including questions
 * 
 * - findQuizzesByClassId(classId: string): Promise<Quiz[]>
 *     Retrieves all quizzes for a specific class
 * 
 * - create(createData: CreateQuizDto): Promise<Quiz>
 *     Creates a new quiz with optional questions. Class ID must be provided in CreateQuizDto.
 *     Validates that lecturer and class exist before creation.
 * 
 * - update(id: string, updateData: UpdateQuizDto): Promise<Quiz>
 *     Updates quiz information. Validates quiz existence and date ranges if applicable.
 * 
 * - delete(id: string): Promise<Quiz>
 *     Soft deletes a quiz by setting its status to 'archived'
 */
import { RequestContextService } from 'src/common/context';

@Injectable()
export class QuizzesService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly logService: LogService,
        private readonly requestContextService: RequestContextService,
    ) { }

    // Get all quizzes
    async findAll(): Promise<Quiz[]> {
        return this.prisma.quiz.findMany({
            include: {
                class: {
                    select: {
                        clid: true,
                        name: true,
                        course: {
                            select: {
                                code: true,
                                name: true
                            }
                        }
                    }
                },
                creator: {
                    select: {
                        lid: true,
                        name: true
                    }
                },
                _count: {
                    select: {
                        questions: true,
                        attempts: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });
    }

    // Get a single quiz by ID
    async findOne(id: string): Promise<Quiz> {
        const quiz = await this.prisma.quiz.findUnique({
            where: { qid: id },
            include: {
                class: {
                    select: {
                        clid: true,
                        name: true,
                        course: {
                            select: {
                                code: true,
                                name: true
                            }
                        },
                        lecturer: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                creator: {
                    select: {
                        lid: true,
                        name: true
                    }
                },
                questions: {
                    select: {
                        ques_id: true,
                        content: true,
                        options_json: true,
                        answer_key_json: true,
                        points: true
                    }
                },
                _count: {
                    select: {
                        questions: true,
                        attempts: true
                    }
                }
            }
        });

        if (!quiz) {
            throw new NotFoundException(`Quiz with ID ${id} not found`);
        }

        return quiz;
    }

    // Get quizzes for a specific class
    async findQuizzesByClassId(classId: string): Promise<Quiz[]> {
        const classExists = await this.prisma.class.findUnique({
            where: { clid: classId }
        });

        if (!classExists) {
            throw new NotFoundException(`Class with ID ${classId} not found`);
        }

        return this.prisma.quiz.findMany({
            where: {
                class_id: classId
            },
            include: {
                _count: {
                    select: {
                        questions: true,
                        attempts: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });
    }

    // Create a new quiz with questions
    async create(createData: CreateQuizDto): Promise<Quiz> {
        // Capture userId from context BEFORE any async operations
        const userId = this.requestContextService.getUserId();
        
        // Check if creator (lecturer) exists
        const lecturerExists = await this.prisma.lecturer.findUnique({
            where: { lid: createData.creator_id }
        });

        if (!lecturerExists) {
            throw new BadRequestException(`Lecturer with ID ${createData.creator_id} not found`);
        }

        // Check if class exists
        const classExists = await this.prisma.class.findUnique({
            where: { clid: createData.class_id }
        });

        if (!classExists) {
            throw new BadRequestException(`Class with ID ${createData.class_id} not found`);
        }

        // Validate date range if both dates are provided
        if (createData.available_from && createData.available_until) {
            if (createData.available_from >= createData.available_until) {
                throw new BadRequestException('available_from must be before available_until');
            }
        }

        // Build questions data for nested creation
        const questionsCreateData = (createData.questions && createData.questions.length > 0)
        ?   createData.questions.map((question, index) => ({
                    content: question.content,
                    options_json: question.options_json || null,
                    answer_key_json: question.answer_key_json,
                    points: question.points || 1.0
                }))
        :   [];

        // Create the quiz with nested questions creation
        const newQuiz = await this.prisma.quiz.create({
            data: {
                name: createData.name,
                description: createData.description,
                status: createData.status,
                available_from: createData.available_from || null,
                available_until: createData.available_until || null,
                settings_json: createData.settings_json,
                creator: {
                    connect: { lid: createData.creator_id }
                },
                class: {
                    connect: { clid: createData.class_id }
                },
                questions: questionsCreateData.length > 0 ? {
                    create: questionsCreateData
                } : undefined
            },
            include: {
                class: {
                    select: {
                        clid: true,
                        name: true
                    }
                },
                creator: {
                    select: {
                        lid: true,
                        name: true
                    }
                },
                questions: {
                    select: {
                        ques_id: true,
                        content: true,
                        options_json: true,
                        points: true
                    }
                }
            }
        });

        await this.logService.createLog('create_quiz', 'Quiz', newQuiz.qid, userId);
        return newQuiz;
    }

    // Update a quiz
    async update(id: string, updateData: UpdateQuizDto): Promise<Quiz> {
        // Capture userId from context BEFORE any async operations
        const userId = this.requestContextService.getUserId();
        
        const existingQuiz = await this.prisma.quiz.findUnique({
            where: { qid: id }
        });

        if (!existingQuiz) {
            throw new NotFoundException(`Quiz with ID ${id} not found`);
        }

        // Validate date range if both dates are provided
        if (updateData.available_from && updateData.available_until) {
            if (updateData.available_from >= updateData.available_until) {
                throw new BadRequestException('available_from must be before available_until');
            }
        }

        const updatedQuiz = await this.prisma.quiz.update({
            where: { qid: id },
            data: updateData,
            include: {
                class: {
                    select: {
                        name: true
                    }
                },
                creator: {
                    select: {
                        name: true
                    }
                },
                _count: {
                    select: {
                        questions: true,
                    }
                }
            }
        });

        await this.logService.createLog('update_quiz', 'Quiz', id, userId);
        return updatedQuiz;
    }

    // Delete a quiz (soft delete by archiving)
    async delete(id: string): Promise<Quiz> {
        // Capture userId from context BEFORE any async operations
        const userId = this.requestContextService.getUserId();
        
        const existingQuiz = await this.prisma.quiz.findUnique({
            where: { qid: id },
            include: {
                _count: {
                    select: {
                        questions: true,
                        attempts: true
                    }
                }
            }
        });

        if (!existingQuiz) {
            throw new NotFoundException(`Quiz with ID ${id} not found`);
        }

        const deletedQuiz = await this.prisma.quiz.update({
            where: { qid: id },
            data: {
                status: 'archived'
            }
        });

        await this.logService.createLog('delete_quiz', 'Quiz', id, userId);
        return deletedQuiz;
    }
}
