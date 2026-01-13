import { IsString, IsOptional, IsEnum, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnswerDto {
    @ApiProperty({ example: 'question001', description: 'Question ID' })
    @IsString()
    question_id: string;

    @ApiProperty({ example: '{"selected": "A"}', description: 'Answer as JSON string' })
    @IsString()
    answer_json: string;
}

export class CreateAttemptDto {
    @ApiProperty({ example: 'quiz001', description: 'Quiz ID' })
    @IsString()
    quiz_id: string;

    @ApiProperty({ example: 'student001', description: 'Student ID (who is taking the quiz)' })
    @IsString()
    student_id:  string;
}

export class SubmitAttemptDto {
    @ApiProperty({
        description: 'Array of answers for the quiz',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                question_id: { type: 'string' },
                answer_json: { type: 'string' }
            }
        }
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateAnswerDto)
    answers: CreateAnswerDto[];
}

export class UpdateAttemptDto {
    @ApiPropertyOptional({ example: 'submitted', enum: ['in_progress', 'submitted', 'graded'], description: 'Status of the attempt' })
    @IsEnum(['in_progress', 'submitted', 'graded'])
    @IsOptional()
    status?: string;

    @ApiPropertyOptional({ example: 85.5, description: 'Score received' })
    @IsNumber()
    @IsOptional()
    score?: number;

    @ApiPropertyOptional({ example: 100, description: 'Maximum possible score' })
    @IsNumber()
    @IsOptional()
    max_score?: number;
}
