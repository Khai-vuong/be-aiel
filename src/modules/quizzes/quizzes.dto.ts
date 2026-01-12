import { IsString, IsOptional, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuizDto {
    @ApiProperty({ example: 'Midterm Quiz', description: 'Name of the quiz' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'This quiz covers chapters 1-5', description: 'Description of the quiz' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'draft', enum: ['draft', 'published', 'archived'], description: 'Status of the quiz' })
    @IsEnum(['draft', 'published', 'archived'])
    status: string;

    @ApiPropertyOptional({ example: '2026-01-15T00:00:00Z', description: 'Date and time when quiz becomes available' })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    available_from?: Date;

    @ApiPropertyOptional({ example: '2026-01-20T23:59:59Z', description: 'Datse and time when quiz expires' })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    available_until?: Date;

    @ApiProperty({ example: 'lecturer001', description: 'Lecturer ID who creates the quiz' })
    @IsString()
    creator_id: string;

    @ApiPropertyOptional({ example: '{"timeLimit": 60, "maxAttempts": 3, "shuffleQuestions": true}', description: 'Quiz settings as JSON string' })
    @IsString()
    @IsOptional()
    settings_json?: string;
}

export class UpdateQuizDto {
    @ApiPropertyOptional({ example: 'Updated Quiz Name', description: 'Name of the quiz' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ example: 'Updated description', description: 'Description of the quiz' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: 'published', enum: ['draft', 'published', 'archived'], description: 'Status of the quiz' })
    @IsEnum(['draft', 'published', 'archived'])
    @IsOptional()
    status?: string;

    @ApiPropertyOptional({ example: '2026-01-15T00:00:00Z', description: 'Date and time when quiz becomes available' })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    available_from?: Date;

    @ApiPropertyOptional({ example: '2026-01-20T23:59:59Z', description: 'Date and time when quiz expires' })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    available_until?: Date;

    @ApiPropertyOptional({ example: '{"timeLimit": 60, "maxAttempts": 3, "shuffleQuestions": true}', description: 'Quiz settings as JSON string' })
    @IsString()
    @IsOptional()
    settings_json?: string;
}
