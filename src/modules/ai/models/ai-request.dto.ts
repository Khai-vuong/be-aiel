import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import type { AIServiceType } from './ai-context.interface';

export class AiRequestDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(['SYSTEM_CONTROL', 'STUDY_ANALYST', 'TUTOR', 'TEACHING_ASSISTANT'])
  serviceType?: AIServiceType;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
