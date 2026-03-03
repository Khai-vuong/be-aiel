import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Quiz } from '@prisma/client';
import { CreateQuizDto, UpdateQuizDto } from './quizzes.dto';
import { LogService } from '../logs';

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
  ) {}

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
                name: true,
              },
            },
          },
        },
        creator: {
          select: {
            lid: true,
            name: true,
          },
        },
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
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
                name: true,
              },
            },
            lecturer: {
              select: {
                name: true,
              },
            },
          },
        },
        creator: {
          select: {
            lid: true,
            name: true,
          },
        },
        questions: {
          select: {
            ques_id: true,
            content: true,
            options_json: true,
            answer_key_json: true,
            points: true,
          },
        },
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    return quiz;
  }

  // Get quizzes for a specific class
  async findQuizzesByClassId(classId: string): Promise<Quiz[]> {
    const classExists = await this.prisma.class.findUnique({
      where: { clid: classId },
    });

    if (!classExists) {
      throw new NotFoundException(`Class with ID ${classId} not found`);
    }

    return this.prisma.quiz.findMany({
      where: {
        class_id: classId,
      },
      include: {
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  // Create a new quiz with questions
  async create(createData: CreateQuizDto): Promise<Quiz> {
    // Check if creator (lecturer) exists
    const lecturerExists = await this.prisma.lecturer.findUnique({
      where: { lid: createData.creator_id },
    });

    if (!lecturerExists) {
      throw new BadRequestException(
        `Lecturer with ID ${createData.creator_id} not found`,
      );
    }

    // ===============================
    // FIX 1: dùng đúng field từ DTO
    // DTO định nghĩa là `clid`
    // ===============================
    const classExists = await this.prisma.class.findUnique({
      where: { clid: createData.clid },
    });

    if (!classExists) {
      throw new BadRequestException(
        `Class with ID ${createData.clid} not found`,
      );
    }

    // Validate date range
    if (createData.available_from && createData.available_until) {
      if (createData.available_from >= createData.available_until) {
        throw new BadRequestException(
          'available_from must be before available_until',
        );
      }
    }

    const questionsCreateData =
      createData.questions && createData.questions.length > 0
        ? createData.questions.map((q) => ({
            content: q.content,
            options_json: q.options_json || null,
            answer_key_json: q.answer_key_json,
            points: q.points || 1.0,
          }))
        : [];

    const newQuiz = await this.prisma.quiz.create({
      data: {
        name: createData.name,
        description: createData.description,
        status: createData.status,
        available_from: createData.available_from || null,
        available_until: createData.available_until || null,
        settings_json: createData.settings_json,
        creator: {
          connect: { lid: createData.creator_id },
        },
        // ===============================
        // FIX 2: connect class bằng clid
        // ===============================
        class: {
          connect: { clid: createData.clid },
        },
        questions:
          questionsCreateData.length > 0
            ? { create: questionsCreateData }
            : undefined,
      },
      include: {
        class: {
          select: {
            clid: true,
            name: true,
          },
        },
        creator: {
          select: {
            lid: true,
            name: true,
          },
        },
        questions: {
          select: {
            ques_id: true,
            content: true,
            options_json: true,
            points: true,
          },
        },
      },
    });

    await this.logService.createLog('create_quiz', lecturerExists.user_id, 'Quiz', newQuiz.qid);
    return newQuiz;
  }

  // Update a quiz
  async update(id: string, updateData: UpdateQuizDto): Promise<Quiz> {
    const existingQuiz = await this.prisma.quiz.findUnique({
      where: { qid: id },
      include: {
        creator: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!existingQuiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    if (updateData.available_from && updateData.available_until) {
      if (updateData.available_from >= updateData.available_until) {
        throw new BadRequestException(
          'available_from must be before available_until',
        );
      }
    }

    const updatedQuiz = await this.prisma.quiz.update({
      where: { qid: id },
      data: updateData,
      include: {
        class: { select: { name: true } },
        creator: { select: { name: true } },
        _count: { select: { questions: true } },
      },
    });

    await this.logService.createLog('update_quiz', existingQuiz.creator.user_id, 'Quiz', id);
    return updatedQuiz;
  }

  // Delete a quiz (soft delete)
  async delete(id: string): Promise<Quiz> {
    const existingQuiz = await this.prisma.quiz.findUnique({
      where: { qid: id },
      include: {
        creator: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!existingQuiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    const deletedQuiz = await this.prisma.quiz.update({
      where: { qid: id },
      data: { status: 'archived' },
    });

    await this.logService.createLog('delete_quiz', existingQuiz.creator.user_id, 'Quiz', id);
    return deletedQuiz;
  }
}
