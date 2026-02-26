import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum NotificationType {
  GENERAL = 'general',
  QUIZ_POSTED = 'quiz_posted',
  GRADE_RELEASED = 'grade_released',
  ENROLLMENT_STATUS = 'enrollment_status',
  DEADLINE_REMINDER = 'deadline_reminder',
  ASSIGNMENT_SUBMITTED = 'assignment_submitted',
}

export enum RelatedResourceType {
  QUIZ = 'Quiz',
  COURSE = 'Course',
  ATTEMPT = 'Attempt',
  ASSIGNMENT = 'Assignment',
  CLASS = 'Class',
}

export class CreateNotificationDto {
  @ApiProperty({
    example: 'New Quiz Available',
    description: 'Title of the notification',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'A new quiz has been posted for your class',
    description: 'Message content of the notification',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    example: NotificationType.QUIZ_POSTED,
    enum: NotificationType,
    description: 'Type of notification',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: string;

  @ApiPropertyOptional({
    example: RelatedResourceType.QUIZ,
    enum: RelatedResourceType,
    description: 'Type of the related resource',
  })
  @IsOptional()
  @IsEnum(RelatedResourceType)
  related_type?: string;

  @ApiPropertyOptional({
    example: 'quiz_12345',
    description: 'ID of the related resource',
  })
  @IsOptional()
  @IsString()
  related_id?: string;

  @ApiProperty({
    example: 'user_12345',
    description: 'User ID to send notification to',
  })
  @IsString()
  recipient_uid: string;
}

export class UpdateNotificationDto {
  @ApiPropertyOptional({
    example: 'Updated Notification Title',
    description: 'Updated title',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated message content',
    description: 'Updated message',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    example: NotificationType.GENERAL,
    enum: NotificationType,
    description: 'Updated notification type',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: string;
}

export class GetNotificationsFilterDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Filter by read status (true for read, false for unread)',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_read?: boolean;

  @ApiPropertyOptional({
    example: NotificationType.QUIZ_POSTED,
    enum: NotificationType,
    description: 'Filter by notification type',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: string;

  @ApiPropertyOptional({
    example: 20,
    description: 'Number of notifications to retrieve (default: 50, max: 100)',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Number of notifications to skip for pagination',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  skip?: number;
}

export class CreateBulkNotificationDto {
  @ApiProperty({
    example: ['user_12345', 'user_67890'],
    description: 'Array of user IDs to send notifications to',
    type: [String],
  })
  @IsString({ each: true })
  recipients: string[];

  @ApiProperty({
    example: {
      title: 'New Quiz Available',
      message: 'A new quiz has been posted for your class',
      type: 'quiz_posted',
      related_type: 'Quiz',
      related_id: 'quiz_12345',
    },
    description: 'Notification data to send to all recipients',
  })
  @ApiProperty({
    example: 'New Quiz Available',
    description: 'Title of the notification',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'A new quiz has been posted for your class',
    description: 'Message content of the notification',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    example: NotificationType.QUIZ_POSTED,
    enum: NotificationType,
    description: 'Type of notification',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: string;

  @ApiPropertyOptional({
    example: RelatedResourceType.QUIZ,
    enum: RelatedResourceType,
    description: 'Type of the related resource',
  })
  @IsOptional()
  @IsEnum(RelatedResourceType)
  related_type?: string;

  @ApiPropertyOptional({
    example: 'quiz_12345',
    description: 'ID of the related resource',
  })
  @IsOptional()
  @IsString()
  related_id?: string;
}

export class CreateClassNotificationDto {
  @ApiProperty({
    example: 'New Quiz Available',
    description: 'Title of the notification',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'A new quiz has been posted for your class',
    description: 'Message content of the notification',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    example: NotificationType.QUIZ_POSTED,
    enum: NotificationType,
    description: 'Type of notification',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: string;

  @ApiPropertyOptional({
    example: RelatedResourceType.QUIZ,
    enum: RelatedResourceType,
    description: 'Type of the related resource',
  })
  @IsOptional()
  @IsEnum(RelatedResourceType)
  related_type?: string;

  @ApiPropertyOptional({
    example: 'quiz_12345',
    description: 'ID of the related resource',
  })
  @IsOptional()
  @IsString()
  related_id?: string;
}
