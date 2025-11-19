import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Class } from '@prisma/client';

@Injectable()
export class ClassesService {

    constructor(private readonly prisma: PrismaService) { }

    // Get all classes
    async findAll(): Promise<Class[]> {
        return this.prisma.class.findMany({
            include: {
                course: {
                    select: {
                        cid: true,
                        code: true,
                        name: true,
                        credits: true
                    }
                },
                lecturer: {
                    select: {
                        lid: true,
                        name: true
                    }
                },
                students: {
                    select: {
                        sid: true,
                        name: true,
                        major: true
                    }
                },
                _count: {
                    select: {
                        students: true,
                        files: true,
                        quizzes: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });
    }

    // Get a single class by ID
    async findOne(id: string): Promise<Class> {
        const classData = await this.prisma.class.findUnique({
            where: { clid: id },
            include: {
                course: {
                    select: {
                        cid: true,
                        code: true,
                        name: true,
                        description: true,
                        credits: true
                    }
                },
                lecturer: {
                    select: {
                        lid: true,
                        name: true,
                        personal_info_json: true
                    }
                },
                students: {
                    select: {
                        sid: true,
                        name: true,
                        major: true,
                        personal_info_json: true
                    }
                },
                files: {
                    select: {
                        fid: true,
                        filename: true,
                        url: true,
                        file_type: true,
                        is_public: true,
                        created_at: true
                    }
                },
                quizzes: {
                    select: {
                        qid: true,
                        name: true,
                        description: true,
                        status: true,
                        available_from: true,
                        available_until: true
                    }
                }
            }
        });

        if (!classData) {
            throw new NotFoundException(`Class with ID ${id} not found`);
        }

        return classData;
    }

    // Update a class
    async update(id: string, updateData: {
        name?: string;
        schedule_json?: string;
        location?: string;
        status?: string;
        lecturer_id?: string;
    }): Promise<Class> {
        const existingClass = await this.prisma.class.findUnique({
            where: { clid: id }
        });

        if (!existingClass) {
            throw new NotFoundException(`Class with ID ${id} not found`);
        }

        // If updating lecturer, check if the new lecturer exists
        if (updateData.lecturer_id) {
            const lecturer = await this.prisma.lecturer.findUnique({
                where: { lid: updateData.lecturer_id }
            });

            if (!lecturer) {
                throw new BadRequestException(`Lecturer with ID ${updateData.lecturer_id} not found`);
            }
        }

        return this.prisma.class.update({
            where: { clid: id },
            data: updateData,
            include: {
                course: true,
                lecturer: true,
                students: true
            }
        });
    }

    // Delete a class
    async delete(id: string): Promise<void> {
        const existingClass = await this.prisma.class.findUnique({
            where: { clid: id },
            include: {
                _count: {
                    select: {
                        students: true,
                        files: true,
                        quizzes: true
                    }
                }
            }
        });

        if (!existingClass) {
            throw new NotFoundException(`Class with ID ${id} not found`);
        }

        // Optional: Check if class has dependencies
        if (existingClass._count.students > 0 || existingClass._count.files > 0 || existingClass._count.quizzes > 0) {
            throw new BadRequestException(
                `Cannot delete class with ${existingClass._count.students} students, ${existingClass._count.files} files, and ${existingClass._count.quizzes} quizzes. Please remove dependencies first.`
            );
        }

        await this.prisma.class.delete({
            where: { clid: id }
        });
    }

    async findClassesByUserId(userId: string): Promise<Class[]> {
        // First, check if user is a student or lecturer
        const student = await this.prisma.student.findUnique({
            where: { user_id: userId }
        });

        const lecturer = await this.prisma.lecturer.findUnique({
            where: { user_id: userId }
        });

        if (!student && !lecturer) {
            throw new NotFoundException(`User with ID ${userId} is not a student or lecturer`);
        }

        // If user is a student, find classes they're enrolled in
        if (student) {
            return this.prisma.class.findMany({
                where: {
                    students: {
                        some: {
                            sid: student.sid
                        }
                    }
                },
                include: {
                    course: {
                        select: {
                            cid: true,
                            code: true,
                            name: true,
                            credits: true
                        }
                    },
                    lecturer: {
                        select: {
                            lid: true,
                            name: true
                        }
                    },
                    _count: {
                        select: {
                            students: true,
                            files: true,
                            quizzes: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                }
            });
        }

        // If user is a lecturer, find classes they're teaching
        if (lecturer) {
            return this.prisma.class.findMany({
                where: {
                    lecturer_id: lecturer.lid
                },
                include: {
                    course: {
                        select: {
                            cid: true,
                            code: true,
                            name: true,
                            credits: true
                        }
                    },
                    students: {
                        select: {
                            sid: true,
                            name: true,
                            major: true
                        }
                    },
                    _count: {
                        select: {
                            students: true,
                            files: true,
                            quizzes: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                }
            });
        }

        return [];
    }
}
