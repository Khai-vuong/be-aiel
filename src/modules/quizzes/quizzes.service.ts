import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Quiz } from '@prisma/client';
import { CreateQuizDto, UpdateQuizDto } from './quizzes.dto';

/**
 * QuizzesService
 * 
 * Service structure:
 * {
 *   // Public async methods (accessible from controller)
 *   findAll: async () => Promise<Quiz[]>,                           // GET all quizzes with class info
 *   findOne: async (id: string) => Promise<Quiz>,                   // GET single quiz by ID with full details
 *   findQuizzesByClassId: async (classId: string) => Promise<Quiz[]>, // GET quizzes for a specific class
 *   create: async (createData: CreateQuizDto) => Promise<Quiz>,     // POST create new quiz
 *   update: async (id: string, updateData: UpdateQuizDto) => Promise<Quiz>, // PUT update quiz information
 *   delete: async (id: string) => Promise<Quiz>,                    // DELETE quiz (soft delete - sets status to 'Archived')
 * }
 */
@Injectable()
export class QuizzesService {

    constructor(private readonly prisma: PrismaService) { }

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

    // Create a new quiz
    async create(clid: string, createData: CreateQuizDto): Promise<Quiz> {
        // Check if creator (lecturer) exists
        const lecturerExists = await this.prisma.lecturer.findUnique({
            where: { lid: createData.creator_id }
        });

        if (!lecturerExists) {
            throw new BadRequestException(`Lecturer with ID ${createData.creator_id} not found`);
        }

        // Check if class exists (if provided)
        if (clid) {
            const classExists = await this.prisma.class.findUnique({
                where: { clid: clid }
            });

            if (!classExists) {
                throw new BadRequestException(`Class with ID ${clid} not found`);
            }
        }

        // Validate date range if both dates are provided
        if (createData.available_from && createData.available_until) {
            if (createData.available_from >= createData.available_until) {
                throw new BadRequestException('available_from must be before available_until');
            }
        }

        return this.prisma.quiz.create({
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
                    connect: { clid: clid } 
                } 
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
                }
            }
        });
    }

    // Update a quiz
    async update(id: string, updateData: UpdateQuizDto): Promise<Quiz> {
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

        return this.prisma.quiz.update({
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
    }

    // Delete a quiz (soft delete by archiving)
    async delete(id: string): Promise<Quiz> {
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

        return this.prisma.quiz.update({
            where: { qid: id },
            data: {
                status: 'archived'
            }
        });
    }
}
