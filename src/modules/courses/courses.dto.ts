import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive, Min } from 'class-validator'

// CourseCreateDto
// 
// Example object:
// {
//   "code": "CS101",
//   "name": "Introduction to Programming",
//   "description": "Basic programming concepts using Python",
//   "credits": 3,
//   "lecturer_id": "lecturer001"
// }
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

// CourseUpdateDto
// 
// Example object (all fields are optional):
// {
//   "code": "CS101",
//   "name": "Advanced Programming",
//   "description": "Advanced programming concepts",
//   "credits": 4,
// }
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
}
