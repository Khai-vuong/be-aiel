import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import type { AIServiceType } from './ai-context.interface';

export class AiRequestDto {
  @IsString()
  text: string = '';

  metadata?: {
    classId?: string;
    courseId?: string;
  };

  @IsOptional()
  @IsString()
  conversationId?: string; // undefined for new conversations, provided for follow-ups

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  //Will not be use in deployment. The orchestrator will determine the serviceType based on intent classification. This is for testing and future extensibility.
  @IsOptional()
  @IsEnum(['SYSTEM_CONTROL', 'STUDY_ANALYST', 'TUTOR', 'TEACHING_ASSISTANT'])
  serviceType?: AIServiceType;
}
