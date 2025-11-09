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

    async registerStudentToCourse(studentId: string, courseId: string): Promise<any> {
        const course = this.prisma.course.findUnique({
            where: { cid: courseId }
        });

        const student = this.prisma.student.findUnique({
            where: { sid: studentId }
        });

        Promise.all([course, student]).then(async ([course, student]) => {
            if (!course) {
                throw new NotFoundException(`Course with ID ${courseId} not found`);
            }

            if (!student) {
                throw new NotFoundException(`Student with ID ${studentId} not found`);
            }

            // Check if student is already enrolled in the course
            const enrollment = await this.prisma.courseEnrollment.findFirst({
                where: {
                    student_id: studentId,
                    course_id: courseId
                }
            });

            if (enrollment) {
                return this.prisma.courseEnrollment.update({
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
            }

            // Enroll student in course
            return this.prisma.courseEnrollment.create({
                data: {
                    student_id: studentId,
                    course_id: courseId
                },
                include: {
                    student: true,
                    course: true
                }
            });
        });
    }

    async unregisterStudentFromCourse(studentId: string, courseId: string): Promise<any> {
        const course = this.prisma.course.findUnique({
            where: { cid: courseId }
        });

        const student = this.prisma.student.findUnique({
            where: { sid: studentId }
        });

        Promise.all([course, student]).then(async ([course, student]) => {
            if (!course) {
                throw new NotFoundException(`Course with ID ${courseId} not found`);
            }

            if (!student) {
                throw new NotFoundException(`Student with ID ${studentId} not found`);
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
            return this.prisma.courseEnrollment.update({
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
        });        
    }

    /**
     * Process pending enrollments and create classes
     * Groups students by course and creates classes with max students per class
     * @param maxStudentsPerClass - Maximum number of students per class (default: 5)
     * @returns Summary of created classes and updated enrollments
     */
    // async processPendingEnrollments(maxStudentsPerClass: number = 5): Promise<any> {
    //     // 1. Get all pending enrollments
    //     const pendingEnrollments = await this.prisma.courseEnrollment.findMany({
    //         where: {
    //             status: 'Pending'
    //         },
    //         include: {
    //             student: {
    //                 select: {
    //                     sid: true,
    //                     name: true
    //                 }
    //             },
    //             course: {
    //                 include: {
    //                     lecturer: true
    //                 }
    //             }
    //         },
    //         orderBy: {
    //             enrolled_at: 'asc' // First come, first served
    //         }
    //     });

    //     if (pendingEnrollments.length === 0) {
    //         return {
    //             message: 'No pending enrollments to process',
    //             classesCreated: 0,
    //             enrollmentsProcessed: 0
    //         };
    //     }

    //     // 2. Group enrollments by course
    //     const enrollmentsByCourse = new Map<string, typeof pendingEnrollments>();
        
    //     for (const enrollment of pendingEnrollments) {
    //         const courseId = enrollment.course_id;
    //         if (!enrollmentsByCourse.has(courseId)) {
    //             enrollmentsByCourse.set(courseId, []);
    //         }
    //         enrollmentsByCourse.get(courseId)!.push(enrollment);
    //     }

    //     // 3. Process each course and create classes
    //     const createdClasses: any[] = [];
    //     let totalEnrollmentsProcessed = 0;

    //     for (const [courseId, enrollments] of enrollmentsByCourse.entries()) {
    //         const course = enrollments[0].course;
    //         const courseCode = course.code;
            
    //         // Calculate how many classes we need for this course
    //         const numberOfClasses = Math.ceil(enrollments.length / maxStudentsPerClass);
            
    //         // Get existing class count for this course to generate unique class names
    //         const existingClassCount = await this.prisma.class.count({
    //             where: {
    //                 course_id: courseId
    //             }
    //         });

    //         // Split students into groups (classes)
    //         for (let i = 0; i < numberOfClasses; i++) {
    //             const startIndex = i * maxStudentsPerClass;
    //             const endIndex = Math.min(startIndex + maxStudentsPerClass, enrollments.length);
    //             const studentsInClass = enrollments.slice(startIndex, endIndex);
                
    //             // Generate class name: CourseCode + ClassNumber (e.g., "CS101-1", "CS101-2")
    //             const classNumber = existingClassCount + i + 1;
    //             const className = `${courseCode}-${classNumber}`;

    //             // Create the class
    //             const newClass = await this.prisma.class.create({
    //                 data: {
    //                     name: className,
    //                     course_id: courseId,
    //                     lecturer_id: course.lecturer_id,
    //                     status: 'active'
    //                 }
    //             });

    //             // Update enrollment status to 'Active' for students in this class
    //             const enrollmentIds = studentsInClass.map(e => e.ceid);
    //             await this.prisma.courseEnrollment.updateMany({
    //                 where: {
    //                     ceid: {
    //                         in: enrollmentIds
    //                     }
    //                 },
    //                 data: {
    //                     status: 'Active'
    //                 }
    //             });

    //             totalEnrollmentsProcessed += studentsInClass.length;

    //             createdClasses.push({
    //                 classId: newClass.clid,
    //                 className: newClass.name,
    //                 courseCode: courseCode,
    //                 courseName: course.name,
    //                 studentCount: studentsInClass.length,
    //                 students: studentsInClass.map(e => ({
    //                     studentId: e.student.sid,
    //                     studentName: e.student.name
    //                 }))
    //             });
    //         }
    //     }

    //     return {
    //         message: 'Successfully processed pending enrollments',
    //         classesCreated: createdClasses.length,
    //         enrollmentsProcessed: totalEnrollmentsProcessed,
    //         maxStudentsPerClass,
    //         classes: createdClasses
    //     };
    // }

    async processPendingEnrollments(maxStudentsPerClass: number = 5): Promise<any> {
        //1. Fetch all the enrollnents with 'Pending' status

        const enrollments = await this.prisma.courseEnrollment.findMany({
            where: {
                status: "Pending"
            },
            include: {
                student: {
                    select: {
                        sid: true,
                        name: true
                    }
                },
                course: {
                    select: {
                        cid: true,
                        code: true,
                        name: true
                    }
                }
            },
                            orderBy: {
                    enrolled_at: 'asc' 
                }
        })

        //2.Group them by course

        //3. For each course, devide them into classes based on maxStudentsPerClass
    }


}
