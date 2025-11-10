import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Unique course code',
    example: 'CS101'
  })
  code: string;

  @ApiProperty({
    description: 'Course name',
    example: 'Introduction to Programming'
  })
  name: string;

  @ApiProperty({
    description: 'Course description',
    example: 'Basic programming concepts using Python',
    required: false
  })
  description?: string;

  @ApiProperty({
    description: 'Number of credits',
    example: 3,
    required: false
  })
  credits?: number;

  @ApiProperty({
    description: 'ID of the lecturer teaching this course',
    example: 'lecturer_id_001'
  })
  lecturer_id: string;
}

export class UpdateCourseDto {
  @ApiProperty({
    description: 'Course code',
    example: 'CS101',
    required: false
  })
  code?: string;

  @ApiProperty({
    description: 'Course name',
    example: 'Advanced Programming',
    required: false
  })
  name?: string;

  @ApiProperty({
    description: 'Course description',
    example: 'Advanced programming concepts',
    required: false
  })
  description?: string;

  @ApiProperty({
    description: 'Number of credits',
    example: 4,
    required: false
  })
  credits?: number;

  @ApiProperty({
    description: 'ID of the lecturer teaching this course',
    example: 'lecturer_id_002',
    required: false
  })
  lecturer_id?: string;
}

export class ProcessEnrollmentsDto {
  @ApiProperty({
    description: 'Maximum number of students per class',
    example: 5,
    default: 5,
    required: false
  })
  maxStudentsPerClass?: number;
}

export class ResponseEnrollmentsToClassesDto {
  @ApiProperty({
    description: 'Number of enrollments processed',
    example: 12
  })
  number_of_enrollments_processed: number;

  @ApiProperty({
    description: 'Number of classes created',
    example: 3
  })
  number_of_classes_created: number;

  @ApiProperty({
    description: 'Maximum number of students allowed per class',
    example: 5
  })
  maximum_students_per_class: number;

  @ApiProperty({
    description: 'Array of created classes with their details',
    type: 'array',
    example: [
      {
        classId: 'class001',
        className: 'CS101 - L1',
        courseCode: 'CS101',
        courseName: 'Introduction to Programming',
        studentCount: 5,
        students: [
          { studentId: 'student001', studentName: 'Alice Johnson' },
          { studentId: 'student002', studentName: 'Bob Wilson' }
        ]
      }
    ]
  })
  created_classes: Array<{
    classId: string;
    className: string;
    courseCode: string;
    courseName: string;
    studentCount: number;
    students: Array<{
      studentId: string;
      studentName: string;
    }>;
  }>;
}
