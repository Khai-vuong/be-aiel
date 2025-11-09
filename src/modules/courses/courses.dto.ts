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
