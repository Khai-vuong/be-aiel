import { IsString, IsOptional, IsObject, IsEnum, IsNumber } from 'class-validator';
import type { AIServiceType } from './ai-context.interface';

export class AiRequestDto {
  @IsString()
  text: string = '';

  metadata?: any

  @IsOptional()
  @IsString()
  conversationId?: string; // undefined for new conversations, provided for follow-ups

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsString()
  instructionPrompt?: string;
}
