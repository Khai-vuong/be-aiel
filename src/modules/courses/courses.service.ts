import { Injectable, BadRequestException, NotFoundException, ConsoleLogger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CourseCreateDto, CourseUpdateDto, CourseResponseEnrollmentsToClassesDto } from './courses.dto';
import { Course, CourseEnrollment } from '@prisma/client';

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
 *   processPendingEnrollments: async (maxStudentsPerClass?: number) => Promise<CourseResponseEnrollmentsToClassesDto>, // POST process enrollments into classes
 *   findEnrollmentsByUserId: async (userId: string) => Promise<CourseEnrollment[]>, // GET enrollments by user ID
 *   findCCoursesByLecturerId: async (lecturerId: string) => Promise<Course[]>, // GET courses by lecturer ID
 * 
 *   // Private methods (internal helper functions)
 *   generateRandomSchedule: (courseDuration: number) => string,       // Generate schedule JSON
 *   generateRandomLocation: () => string                              // Generate location string
 * }
 */
@Injectable()
export class CoursesService {

    constructor(private readonly prisma: PrismaService) { }

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

        return this.prisma.course.create({
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
    }

    // Update a course
    async update(id: string, updateCourseDto: CourseUpdateDto): Promise<Course> {
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

        return this.prisma.course.update({
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

    // Add a lecturer to a course
    async addLecturer(courseId: string, lecturerId: string): Promise<Course> {
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

        return this.prisma.course.update({
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
    }

    // Remove a lecturer from a course
    async removeLecturer(courseId: string, lecturerId: string): Promise<Course> {
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

        return this.prisma.course.update({
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
    }

    async registerStudentToCourse(studentUserId: string, courseId: string): Promise<any> {

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

        return {
            "enrollment": enrollmentRegister,
            "message": `Enrolled student with ID ${studentId} to course with ID ${courseId}`
        };
    }

    async unregisterStudentFromCourse(studentUserId: string, courseId: string): Promise<any> {


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


        return {
            "enrollment": unregisteredEnrollment,
            "message": `Unregistered student with ID ${studentId} from course with ID ${courseId}`
        };
    }

    /**
     * Generate random schedule for a class
     * @param courseDuration - Duration in hours (credits - 1)
     * @returns Schedule JSON with day, start time, end time, and room
     */
    private generateRandomSchedule(courseDuration: number): string {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const randomDay = days[Math.floor(Math.random() * days.length)];

        // Morning slots: 7-10am, Afternoon slots: 12-4pm
        const morningSlots = [7, 8, 9, 10];
        const afternoonSlots = [12, 13, 14, 15, 16];

        // Determine if morning or afternoon session
        const isMorning = Math.random() < 0.5;
        const availableSlots = isMorning ? morningSlots : afternoonSlots;

        // Filter slots where class can fit without crossing session boundary
        const sessionEnd = isMorning ? 12 : 18;
        const validSlots = availableSlots.filter(slot => slot + courseDuration <= sessionEnd);

        // Pick random valid start time
        const startHour = validSlots[Math.floor(Math.random() * validSlots.length)];
        const endHour = startHour + courseDuration;

        // Format time as HH:00
        const formatTime = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

        return JSON.stringify({
            day: randomDay,
            start: formatTime(startHour),
            end: formatTime(endHour),
        });
    }

    /**
     * Generate random location for a class
     * @returns Location string
     */
    private generateRandomLocation(): string {
        const buildings = [
            { name: 'Computer Science Building', prefix: 'CS' },
            { name: 'Mathematics Building', prefix: 'MATH' },
            { name: 'Science Building', prefix: 'SCI' },
            { name: 'Engineering Building', prefix: 'ENG' },
            { name: 'Library Complex', prefix: 'LIB' }
        ];

        const building = buildings[Math.floor(Math.random() * buildings.length)];
        const roomNumber = Math.floor(Math.random() * 500) + 100;

        return `${building.name} - Room ${roomNumber}`;
    }

    /**
     * Process pending enrollments and create classes
     * Groups students by course and creates classes with max students per class
     * @param maxStudentsPerClass - Maximum number of students per class (default: 5)
     * @returns Summary of created classes and updated enrollments
     */
    async processPendingEnrollments(maxStudentsPerClass: number = 5): Promise<CourseResponseEnrollmentsToClassesDto> {
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
                        name: true,
                        credits: true,
                        lecturers: {
                            select: {
                                lid: true
                            },
                            take: 1
                        }
                    }
                }
            },
            orderBy: {
                enrolled_at: 'asc' 
            }
        })

        if (enrollments.length === 0) {
            return {
                number_of_classes_created: 0,
                number_of_enrollments_processed: 0,
                maximum_students_per_class: maxStudentsPerClass,
                created_classes: []
            };
        }

        //2.Group them by course
        //This woulld create a map courseEnrollmentsMap: courseID -> enrollments[]
        //And a map courseDetailsMap: courseID -> Course
        //Couldn't use Course -> enrollments[] directly due to object reference issues

        let courseEnrollmentsMap = new Map<string, typeof enrollments>();
        let courseDetailsMap = new Map<string, typeof enrollments[0]['course']>();
        enrollments.forEach(enrollment => {
            const courseId = enrollment.course.cid;
            if (!courseEnrollmentsMap.has(courseId)) {
                courseEnrollmentsMap.set(courseId, []);
                courseDetailsMap.set(courseId, enrollment.course);
            }
            courseEnrollmentsMap.get(courseId)?.push(enrollment);
        });


        //3. For each course, devide them into classes based on maxStudentsPerClass
        //To prevent unbalanced classes like 5,5,5,1, I implemented the baseSize
        //Each class will have either baseSize or baseSize + 1 students to ensure balance

        let createdClasses: any[] = [];
        for (const [courseId, enrollments] of courseEnrollmentsMap) {
            const course = courseDetailsMap.get(courseId)!;
            const totalStudents = enrollments.length;
            const numberOfClasses = Math.ceil(totalStudents / maxStudentsPerClass);

            // Calculate balanced partition sizes
            const baseSize = Math.floor(totalStudents / numberOfClasses);
            const remainder = totalStudents % numberOfClasses;
            
            // First 'remainder' classes get baseSize + 1, rest get baseSize
            const classSizes: number[] = [];
            for (let i = 0; i < numberOfClasses; i++) {
                classSizes.push(i < remainder ? baseSize + 1 : baseSize);
            }

            let currentIndex = 0;
            for (let index = 0; index < numberOfClasses; index++) {
                const classSize = classSizes[index];
                const studentsInClass = enrollments.slice(currentIndex, currentIndex + classSize);
                const studentIds = studentsInClass.map(enrollment => enrollment.student.sid);
                currentIndex += classSize;
                
                const className = `${course.code} - L${index + 1}`;

                // Generate random schedule and location
                const courseDuration = (course.credits || 3) - 1; // Default to 3 credits if not set
                const scheduleJson = this.generateRandomSchedule(courseDuration);
                const location = this.generateRandomLocation();

                const newClass = await this.prisma.class.create({
                    data: {
                        name: className,
                        course_id: course.cid,
                        lecturer_id: course.lecturers[0]?.lid || '',
                        status: "Active",
                        schedule_json: scheduleJson,
                        location: location,
                        students: {
                            connect: studentIds.map(sid => ({ sid }))
                        }
                    },
                });

                // Update enrollment status to 'Completed'
                const enrollmentIds = studentsInClass.map(enrollment => enrollment.ceid);
                await this.prisma.courseEnrollment.updateMany({
                    where: {
                        ceid: { in: enrollmentIds }
                    },
                    data: {
                        status: 'Completed'
                    }
                });

                createdClasses.push(newClass);       
            }
        }
        
        return {
            number_of_classes_created: createdClasses.length,
            number_of_enrollments_processed: enrollments.length,
            maximum_students_per_class: maxStudentsPerClass,
            created_classes: createdClasses
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
