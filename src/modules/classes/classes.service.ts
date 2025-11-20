import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Class } from '@prisma/client';
import { ClassesUpdateDto } from './classes.dto';

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

    // Get classes for the logged-in user
    async findClassesByUserId(userId: string): Promise<Class[]> {
        // I dont use user.student/lecturer.classes because this way I can modify the query
        const user = await this.prisma.user.findUnique({
            where: { uid: userId },
            include: {
                student: true,
                lecturer: true
            }
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        // If user is a student, find classes they're enrolled in via M-N relationship
        if (user.student) {
            return this.prisma.class.findMany({
                where: {
                    students: {
                        some: {
                            sid: user.student.sid
                        }
                    }
                },
                include: {
                    course: {
                        select: {
                            name: true,
                        }
                    },
                    lecturer: {
                        select: {
                            name: true
                        }
                    },
                },
            });
        }

        // If user is a lecturer, find classes they're teaching
        if (user.lecturer) {
            return this.prisma.class.findMany({
                where: {
                    lecturer_id: user.lecturer.lid
                },
                include: {
                    course: {
                        select: {
                            name: true,
                        }
                    },
                },
            });
        }

        return [];
    }

    // Update a class
    async update(id: string, updateData: ClassesUpdateDto): Promise<Class> {
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

        // Separate lecturer_id from other update data
        // The below is  thhe shortcut for lecturer_id? update
        // Also, prisma automatically disconnect the old lecturer when connecting a new one
        const { lecturer_id, ...classData } = updateData;

        return this.prisma.class.update({
            where: { clid: id },
            data: {
                ...classData,
                ...(lecturer_id && {
                    lecturer: {
                        connect: { lid: lecturer_id }
                    }
                })
            },
            include: {
                course: true,
                lecturer: {
                    select: {
                        name: true
                    }
                },
            }
        });
    }

    // Delete a class
    async delete(id: string): Promise<Class> {
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

        return this.prisma.class.update({
            where: { clid: id },
            data: {
                status: 'Canceled'
            },
        })
    }

}
