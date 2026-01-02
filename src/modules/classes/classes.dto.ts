import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive, Min } from 'class-validator';

// ClassesUpdateDto
// 
// Request DTO for updating class information.
// All fields are optional.
// 
// Example object:
// {
//   "name": "CS101 - L1 (Updated)",
//   "schedule_json": "{\"day\": \"Tuesday\", \"start\": \"10:00\", \"end\": \"12:00\"}",
//   "location": "Science Building - Room 205",
//   "status": "Active",
//   "lecturer_id": "lecturer002"
// }
export class ClassesUpdateDto {
    @ApiProperty({ 
        description: 'Class name', 
        example: 'CS101 - L1 (Updated)', 
        required: false 
    })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ 
        description: 'Class schedule in JSON format', 
        example: '{"day": "Tuesday", "start": "10:00", "end": "12:00"}', 
        required: false 
    })
    @IsString()
    @IsOptional()
    schedule_json?: string;

    @ApiProperty({ 
        description: 'Class location', 
        example: 'Science Building - Room 205', 
        required: false 
    })
    @IsString()
    @IsOptional()
    location?: string;

    @ApiProperty({ 
        description: 'Class status', 
        example: 'Active', 
        enum: ['Active', 'Cancelled', 'Completed'], 
        required: false 
    })
    @IsString()
    @IsOptional()
    status?: string;

    @ApiProperty({ 
        description: 'ID of the lecturer teaching this class', 
        example: 'lecturer002', 
        required: false 
    })
    @IsString()
    @IsOptional()
    lecturer_id?: string;
};


// ClassCreateDto
// 
// Request DTO for creating classes from pending enrollments.
// Specifies the maximum number of students allowed per class.
// 
// Example object:
// {
//   "maxStudentsPerClass": 5
// }
export class ClassCreateDto {
  @ApiProperty({ description: 'Maximum number of students per class', example: 5, default: 5, required: false })
  @IsNumber()
  @IsPositive()
  @Min(1)
  @IsOptional()
  maxStudentsPerClass?: number;
}


// ResponseCreateClassDto
// 
// Response DTO returned after processing enrollments and creating classes.
// Contains summary statistics and detailed information about all created classes.
// 
// Example object:
// {
//   "number_of_enrollments_processed": 12,
//   "number_of_classes_created": 3,
//   "maximum_students_per_class": 5,
//   "created_classes": [
//     {
//       "classId": "class001",
//       "className": "CS101 - L1",
//       "courseCode": "CS101",
//       "courseName": "Introduction to Programming",
//       "studentCount": 5,
//       "students": [
//         { "studentId": "student001", "studentName": "Alice Johnson" },
//         { "studentId": "student002", "studentName": "Bob Wilson" }
//       ]
//     }
//   ]
// }
export class ResponseCreateClassDto {
  @ApiProperty({ 
    description: 'Total number of pending enrollments that were processed and converted into class assignments', 
    example: 12 
  })
  number_of_enrollments_processed: number;

  @ApiProperty({ 
    description: 'Total number of classes created from the enrollments', 
    example: 3 
  })
  number_of_classes_created: number;

  @ApiProperty({ 
    description: 'Maximum number of students allowed per class (as specified in the request)', 
    example: 5 
  })
  maximum_students_per_class: number;

  @ApiProperty({
    description: 'Array of created classes with their details including assigned students',
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
