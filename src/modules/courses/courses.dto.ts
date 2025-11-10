import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive, Min } from 'class-validator'

/**
 * CourseCreateDto
 * 
 * Example object:
 * {
 *   "code": "CS101",
 *   "name": "Introduction to Programming",
 *   "description": "Basic programming concepts using Python",
 *   "credits": 3,
 *   "lecturer_id": "lecturer001"
 * }
 */
export class CourseCreateDto {
  @ApiProperty({ description: 'Unique course code', example: 'CS101' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Course name', example: 'Introduction to Programming' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Course description', example: 'Basic programming concepts using Python', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Number of credits', example: 3, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  credits?: number;

  @ApiProperty({ description: 'ID of the lecturer teaching this course', example: 'lecturer001' })
  @IsString()
  @IsNotEmpty()
  lecturer_id: string;
}

/**
 * CourseUpdateDto
 * 
 * Example object (all fields are optional):
 * {
 *   "code": "CS101",
 *   "name": "Advanced Programming",
 *   "description": "Advanced programming concepts",
 *   "credits": 4,
 *   "lecturer_id": "lecturer002"
 * }
 */
export class CourseUpdateDto {
  @ApiProperty({ description: 'Course code', example: 'CS101', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ description: 'Course name', example: 'Advanced Programming', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Course description', example: 'Advanced programming concepts', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Number of credits', example: 4, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  credits?: number;

  @ApiProperty({ description: 'ID of the lecturer teaching this course', example: 'lecturer002', required: false })
  @IsString()
  @IsOptional()
  lecturer_id?: string;
}

/**
 * CourseProcessEnrollmentsDto
 * 
 * Example object:
 * {
 *   "maxStudentsPerClass": 5
 * }
 */
export class CourseProcessEnrollmentsDto {
  @ApiProperty({ description: 'Maximum number of students per class', example: 5, default: 5, required: false })
  @IsNumber()
  @IsPositive()
  @Min(1)
  @IsOptional()
  maxStudentsPerClass?: number;
}

/**
 * CourseResponseEnrollmentsToClassesDto
 * 
 * Example object:
 * {
 *   "number_of_enrollments_processed": 12,
 *   "number_of_classes_created": 3,
 *   "maximum_students_per_class": 5,
 *   "created_classes": [
 *     {
 *       "classId": "class001",
 *       "className": "CS101 - L1",
 *       "courseCode": "CS101",
 *       "courseName": "Introduction to Programming",
 *       "studentCount": 5,
 *       "students": [
 *         { "studentId": "student001", "studentName": "Alice Johnson" },
 *         { "studentId": "student002", "studentName": "Bob Wilson" }
 *       ]
 *     }
 *   ]
 * }
 */
export class CourseResponseEnrollmentsToClassesDto {
  @ApiProperty({ description: 'Number of enrollments processed', example: 12 })
  number_of_enrollments_processed: number;

  @ApiProperty({ description: 'Number of classes created', example: 3 })
  number_of_classes_created: number;

  @ApiProperty({ description: 'Maximum number of students allowed per class', example: 5 })
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
