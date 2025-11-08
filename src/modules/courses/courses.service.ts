import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateCourseDto, UpdateCourseDto } from './courses.dto';
import { Course } from '@prisma/client';

@Injectable()
export class CoursesService {

    constructor(private readonly prisma: PrismaService) { }

    // Get all courses
    async findAll(): Promise<Course[]> {
        return this.prisma.course.findMany({
            include: {
                lecturer: {
                    include: {
                        user: {
                            select: {
                                username: true,
                                status: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        enrollments: true,
                        classes: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });
    }

    // Get a single course by ID
    async findOne(id: string): Promise<any> {
        const course = await this.prisma.course.findUnique({
            where: { cid: id },
            include: {
                lecturer: {
                    include: {
                        user: {
                            select: {
                                username: true,
                                status: true
                            }
                        }
                    }
                },
                enrollments: {
                    include: {
                        student: {
                            select: {
                                sid: true,
                                name: true,
                                major: true
                            }
                        }
                    }
                },
                classes: {
                    select: {
                        clid: true,
                        name: true,
                        schedule_json: true,
                        location: true,
                        status: true
                    }
                }
            }
        });

        if (!course) {
            throw new NotFoundException(`Course with ID ${id} not found`);
        }

        return course;
    }

    // Create a new course
    async create(createCourseDto: CreateCourseDto): Promise<Course> {
        // Check if lecturer exists
        const lecturer = await this.prisma.lecturer.findUnique({
            where: { lid: createCourseDto.lecturer_id }
        });

        if (!lecturer) {
            throw new BadRequestException(`Lecturer with ID ${createCourseDto.lecturer_id} not found`);
        }

        // Check if course code already exists
        const existingCourse = await this.prisma.course.findUnique({
            where: { code: createCourseDto.code }
        });

        if (existingCourse) {
            throw new BadRequestException(`Course with code ${createCourseDto.code} already exists`);
        }

        return this.prisma.course.create({
            data: createCourseDto,
            include: {
                lecturer: {
                    include: {
                        user: {
                            select: {
                                username: true
                            }
                        }
                    }
                }
            }
        });
    }

    // Update a course
    async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
        const course = await this.prisma.course.findUnique({
            where: { cid: id }
        });

        if (!course) {
            throw new NotFoundException(`Course with ID ${id} not found`);
        }

        // If updating lecturer, check if the new lecturer exists
        if (updateCourseDto.lecturer_id) {
            const lecturer = await this.prisma.lecturer.findUnique({
                where: { lid: updateCourseDto.lecturer_id }
            });

            if (!lecturer) {
                throw new BadRequestException(`Lecturer with ID ${updateCourseDto.lecturer_id} not found`);
            }
        }

        // If updating code, check if new code already exists
        if (updateCourseDto.code && updateCourseDto.code !== course.code) {
            const existingCourse = await this.prisma.course.findUnique({
                where: { code: updateCourseDto.code }
            });

            if (existingCourse) {
                throw new BadRequestException(`Course with code ${updateCourseDto.code} already exists`);
            }
        }

        return this.prisma.course.update({
            where: { cid: id },
            data: updateCourseDto,
            include: {
                lecturer: {
                    include: {
                        user: {
                            select: {
                                username: true
                            }
                        }
                    }
                }
            }
        });
    }

    // Delete a course
    async delete(id: string): Promise<void> {
        const course = await this.prisma.course.findUnique({
            where: { cid: id },
            include: {
                _count: {
                    select: {
                        enrollments: true,
                        classes: true
                    }
                }
            }
        });

        if (!course) {
            throw new NotFoundException(`Course with ID ${id} not found`);
        }

        // Optional: Prevent deletion if there are active enrollments
        if (course._count.enrollments > 0) {
            throw new BadRequestException(
                `Cannot delete course with ${course._count.enrollments} active enrollments. Please remove enrollments first.`
            );
        }

        await this.prisma.course.delete({
            where: { cid: id }
        });
    }

}
