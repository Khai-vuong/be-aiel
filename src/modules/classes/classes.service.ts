import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Class } from '@prisma/client';
import { ClassesUpdateDto, ResponseCreateClassDto } from './classes.dto';
import supabase from 'src/supabase/supabaseClient';

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

    // Add resource (file) to class
    //     Uploaded file: {
    //   fieldname: 'file',
    //   originalname: 'Ahko.jpg',
    //   encoding: '7bit',
    //   mimetype: 'image/jpeg',
    //   destination: './uploads',
    //   filename: 'file-1763879520817-6296.jpg',
    //   path: 'uploads\\file-1763879520817-6296.jpg',
    //   size: 33767
    // }
    async addResource(userId: string, classId: string, file: Express.Multer.File) {
        //UserId, clid and file have been verified by the guards

        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${classId}/${timestamp}-${file.originalname}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('class-files')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (uploadError) {
            throw new BadRequestException(`Failed to upload file: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('class-files')
            .getPublicUrl(fileName);

        if (!urlData || !urlData.publicUrl) {
            throw new BadRequestException('Failed to get file URL');
        }

        // Determine file type based on mime type
        let fileType = 'document';
        if (file.mimetype.startsWith('video/')) {
            fileType = 'video';
        } else if (file.mimetype.startsWith('image/')) {
            fileType = 'image';
        } else if (file.mimetype.includes('pdf') || file.mimetype.includes('document')) {
            fileType = 'document';
        }

        // Create file record in database
        const createdFile = await this.prisma.file.create({
            data: {
                filename: file.originalname,
                url: urlData.publicUrl,
                size: file.size,
                mime_type: file.mimetype,
                file_type: fileType,
                is_public: false,
                class_id: classId,
                uploader_id: userId
            }
        });

        // Return the updated class with the new file
        return this.prisma.class.findUnique({
            where: { clid: classId },
            include: {
                files: {
                    orderBy: {
                        created_at: 'desc'
                    }
                },
                course: {
                    select: {
                        name: true,
                        code: true
                    }
                },
                lecturer: {
                    select: {
                        name: true
                    }
                }
            }
        });
    }
     
    /**
     * Process pending enrollments and create classes
     * Groups students by course and creates classes with max students per class
     * @param maxStudentsPerClass - Maximum number of students per class (default: 5)
     * @returns Summary of created classes and updated enrollments
     */
    async createClassesFromEnrollments(maxStudentsPerClass: number = 5): Promise<ResponseCreateClassDto> {
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

}
