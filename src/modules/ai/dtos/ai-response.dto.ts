import { 
  IsBoolean, 
  IsEnum, 
  IsInt, 
  IsObject, 
  IsOptional, 
  IsString,
  Min,
  ValidateNested 
} from "class-validator";
import { Type } from "class-transformer";

export class AiResponseDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  conversationTitle?: string;

  @IsOptional()
  @IsString()
  messageId?: string;

  @IsBoolean()
  success: boolean;

  @IsString()
  text: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiErrorDto)
  error?: AiErrorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiMetadataDto)
  metadata?: AiMetadataDto;
}



// Nested DTO cho error
export class AiErrorDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  code?: string;
}

// Nested DTO cho metadata
export class AiMetadataDto {
  @IsOptional()
  @IsString()
  createdAt?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  processingTime?: number;

}
