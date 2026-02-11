import { Injectable, BadRequestException, NotFoundException, ConsoleLogger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CourseCreateDto, CourseUpdateDto } from './courses.dto';
import { Course, CourseEnrollment } from '@prisma/client';
import { LogService } from '../logs';

/**
 * CoursesService
 * 
 * Service structure:
 * {
 *   // Public async methods (accessible from controller)
 *   findAll: async () => Promise<Course[]>,                           // GET all courses with lecturers info
 *   findOne: async (id: string) => Promise<Course>,                   // GET single course by ID
 *   create: async (createCourseDto: CourseCreateDto) => Promise<Course>, // POST create new course
 *   update: async (id: string, updateCourseDto: CourseUpdateDto) => Promise<Course>, // PUT update course
 *   delete: async (id: string) => Promise<void>,                      // DELETE course
 *   addLecturer: async (courseId: string, lecturerId: string) => Promise<Course>, // POST add lecturer to course
 *   removeLecturer: async (courseId: string, lecturerId: string) => Promise<Course>, // DELETE remove lecturer from course
 *   registerStudentToCourse: async (studentUserId: string, courseId: string) => Promise<any>, // POST student enrollment
 *   unregisterStudentFromCourse: async (studentUserId: string, courseId: string) => Promise<any>, // PUT unregister student
 *   findEnrollmentsByUserId: async (userId: string) => Promise<CourseEnrollment[]>, // GET enrollments by user ID
 *   findCCoursesByLecturerId: async (lecturerId: string) => Promise<Course[]>, // GET courses by lecturer ID
 * 
 * }
 */
import { RequestContextService } from 'src/common/context';

@Injectable()
export class CoursesService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly logService: LogService,
        private readonly requestContextService: RequestContextService,
    ) { }

    // Get all courses
    async findAll(): Promise<Course[]> {
        return this.prisma.course.findMany({
            include: {
                lecturers: {
                    select: {
                        name: true,
                        lid: true,
                        personal_info_json: true
                    }
                },
            },
            orderBy: {
                created_at: 'desc'
            }
        });
    }

    // Get a single course by ID
    async findOne(id: string): Promise<Course> {
        const course = await this.prisma.course.findUnique({
            where: { cid: id },
            include: {
                lecturers: {
                    select: {
                        name: true,
                        lid: true,
                        personal_info_json: true
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
    async create(createCourseDto: CourseCreateDto): Promise<Course> {
        // Capture userId from context BEFORE any async operations
        const userId = this.requestContextService.getUserId();
        
        // Check if lecturer exists
        const lecturer = this.prisma.lecturer.findUnique({
            where: { lid: createCourseDto.lecturer_id }
        });

        // Check if course code already exists
        const existingCourse = this.prisma.course.findUnique({
            where: { code: createCourseDto.code }
        });

        const [lecturerResult, existingCourseResult] = await Promise.all([lecturer, existingCourse]);

        if (!lecturerResult) {
            throw new BadRequestException(`Lecturer with ID ${createCourseDto.lecturer_id} not found`);
        }

        if (existingCourseResult) {
            throw new BadRequestException(`Course with code ${createCourseDto.code} already exists`);
        }

        const { lecturer_id, ...courseData } = createCourseDto;

        const newCourse = await this.prisma.course.create({
            data: {
                ...courseData,
                lecturers: {
                    connect: { lid: lecturer_id }
                }
            },
            include: {
                lecturers: true,
            }
        });

        await this.logService.createLog('create_course', 'Course', newCourse.cid, userId);
        return newCourse;
    }

    // Update a course
    async update(id: string, updateCourseDto: CourseUpdateDto): Promise<Course> {
        // Capture userId from context BEFORE any async operations
        const userId = this.requestContextService.getUserId();
        
        const course = await this.prisma.course.findUnique({
            where: { cid: id }
        });

        if (!course) {
            throw new NotFoundException(`Course with ID ${id} not found`);
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

        const updatedCourse = await this.prisma.course.update({
            where: { cid: id },
            data: updateCourseDto,
            include: {
                lecturers: {
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

        await this.logService.createLog('update_course', 'Course', id, userId);
        return updatedCourse;
    }

    // Delete a course
    async delete(id: string): Promise<void> {
        // Capture userId from context BEFORE any async operations
        const userId = this.requestContextService.getUserId();
        
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

        await this.logService.createLog('delete_course', 'Course', id, userId);
    }

    // Add a lecturer to a course
    async addLecturer(courseId: string, lecturerId: string): Promise<Course> {
        // Capture userId from context BEFORE any async operations
        const userId = this.requestContextService.getUserId();
        
        const course = await this.prisma.course.findUnique({
            where: { cid: courseId }
        });

        if (!course) {
            throw new NotFoundException(`Course with ID ${courseId} not found`);
        }

        const lecturer = await this.prisma.lecturer.findUnique({
            where: { lid: lecturerId }
        });

        if (!lecturer) {
            throw new NotFoundException(`Lecturer with ID ${lecturerId} not found`);
        }

        const updatedCourse = await this.prisma.course.update({
            where: { cid: courseId },
            data: {
                lecturers: {
                    connect: { lid: lecturerId }
                }
            },
            include: {
                lecturers: {
                    select: {
                        lid: true,
                        name: true,
                        personal_info_json: true
                    }
                }
            }
        });

        await this.logService.createLog('add_lecturer_to_course', 'Course', courseId, userId);
        return updatedCourse;
    }

    // Remove a lecturer from a course
    async removeLecturer(courseId: string, lecturerId: string): Promise<Course> {
        // Capture userId from context BEFORE any async operations
        const userId = this.requestContextService.getUserId();
        
        const course = await this.prisma.course.findUnique({
            where: { cid: courseId },
            include: {
                lecturers: true
            }
        });

        if (!course) {
            throw new NotFoundException(`Course with ID ${courseId} not found`);
        }

        const lecturerExists = course.lecturers.some(l => l.lid === lecturerId);
        if (!lecturerExists) {
            throw new BadRequestException(`Lecturer with ID ${lecturerId} is not teaching course ${courseId}`);
        }

        const updatedCourse = await this.prisma.course.update({
            where: { cid: courseId },
            data: {
                lecturers: {
                    disconnect: { lid: lecturerId }
                }
            },
            include: {
                lecturers: {
                    select: {
                        lid: true,
                        name: true,
                        personal_info_json: true
                    }
                }
            }
        });

        await this.logService.createLog('remove_lecturer_from_course', 'Course', courseId, userId);
        return updatedCourse;
    }

    async registerStudentToCourse(studentUserId: string, courseId: string): Promise<any> {
        // Capture userId from context BEFORE any async operations
        const userId = this.requestContextService.getUserId();

        const studentIdQuery = this.prisma.student.findFirst({
            where: { user_id: studentUserId }
        }).then(student => student?.sid);
        
        const courseQuery = this.prisma.course.findUnique({
            where: { cid: courseId }
        });
        
        const [course, studentId] = await Promise.all([courseQuery, studentIdQuery]);
        
        if (!course) {
            throw new NotFoundException(`Course with ID ${courseId} not found`);
        }

        if (!studentId) {
            throw new NotFoundException(`Student with ID ${studentUserId} not found`);
        }


        // Check if student is already enrolled in the course
        const enrollment = await this.prisma.courseEnrollment.findFirst({
            where: {
                student_id: studentId,
                course_id: courseId
            }
        });

        if (enrollment) {
            const enrollmentRegister = await this.prisma.courseEnrollment.update({
                where: {
                    ceid: enrollment.ceid
                },
                data: {
                    status: 'Pending'
                },
                include: {
                    student: true,
                    course: true
                }
            });

            await this.logService.createLog('re_course_enrollment', 'CourseEnrollment', enrollment.ceid, userId);
             
            return {
                "enrollment": enrollmentRegister,
                "message": `Re-enrolled student with ID ${studentId} to course with ID ${courseId}`
            };
        }

        // Enroll student in course
        const enrollmentRegister = await this.prisma.courseEnrollment.create({
            data: {
                student_id: studentId,
                course_id: courseId
            },
            include: {
                student: true,
                course: true
            }
        });

        await this.logService.createLog('course_enrollment', 'CourseEnrollment', enrollmentRegister.ceid, userId);

        return {
            "enrollment": enrollmentRegister,
            "message": `Enrolled student with ID ${studentId} to course with ID ${courseId}`
        };
    }

    async unregisterStudentFromCourse(studentUserId: string, courseId: string): Promise<any> {
        // Capture userId from context BEFORE any async operations
        const userId = this.requestContextService.getUserId();


        const studentIdQuery = this.prisma.student.findFirst({
            where: { user_id: studentUserId }
        }).then(student => student?.sid);

        
        const courseQuery = this.prisma.course.findUnique({
            where: { cid: courseId }
        });
        
        const [course, studentId] = await Promise.all([courseQuery, studentIdQuery]);

        if (!course) {
            throw new NotFoundException(`Course with ID ${courseId} not found`);
        }

        if (!studentId) {
            throw new NotFoundException(`Student with ID ${studentUserId} not found`);
        }

        // Check if student is enrolled in the course
        const enrollment = await this.prisma.courseEnrollment.findFirst({
            where: {
                student_id: studentId,
                course_id: courseId
            }
        });

        if (!enrollment) {
            throw new BadRequestException(`Student with ID ${studentId} is not enrolled in course with ID ${courseId}`);
        }

        // Unenroll student from course
        const unregisteredEnrollment = await this.prisma.courseEnrollment.update({
            where: {
                ceid: enrollment.ceid
            },
            data: {
                status: 'Unregistered'
            },
            include: {
                student: true,
                course: true
            }
        });

        await this.logService.createLog('unregister_enrollment', 'CourseEnrollment', enrollment.ceid, userId);

        return {
            "enrollment": unregisteredEnrollment,
            "message": `Unregistered student with ID ${studentId} from course with ID ${courseId}`
        };
    }

    async findEnrollmentsByUserId(userId: string): Promise<CourseEnrollment[]> {
        const student = await this.prisma.student.findUnique({
            where: { user_id: userId },
            include: {
                enrollments: true
            }
        });

        if (!student) {
            throw new NotFoundException(`Student with user ID ${userId} not found`);
        }
        return student.enrollments;
    }

    async findCoursesByUserId(userId: string): Promise<Course[]> {
        const lecturer = await this.prisma.lecturer.findUnique({
            where: { user_id: userId },
            include: {
                courses: true
            }
        });
        if (!lecturer) {
            throw new NotFoundException(`Lecturer with user ID ${userId} not found`);
        }
        return lecturer.courses;
    }


}
