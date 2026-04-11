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
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsString()
  customSystemPrompt?: string;

  //Will not be use in deployment. The orchestrator will determine the serviceType based on intent classification. This is for testing and future extensibility.
  @IsOptional()
  @IsEnum(['SYSTEM_CONTROL', 'STUDY_ANALYST', 'TUTOR', 'TEACHING_ASSISTANT'])
  serviceType?: AIServiceType;
}
