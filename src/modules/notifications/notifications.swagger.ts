import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

export function SwaggerGetAllNotifications() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all notifications (Admin only)' }),
    ApiQuery({
      name: 'is_read',
      required: false,
      type: Boolean,
      description: 'Filter by read status',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      type: String,
      description: 'Filter by notification type',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of notifications to retrieve',
    }),
    ApiQuery({
      name: 'skip',
      required: false,
      type: Number,
      description: 'Number of notifications to skip',
    }),
    ApiResponse({
      status: 200,
      description: 'List of notifications retrieved successfully',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nid: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            type: { type: 'string' },
            is_read: { type: 'boolean' },
            details_json: { type: 'string', nullable: true },
            related_type: { type: 'string', nullable: true },
            related_id: { type: 'string', nullable: true },
            user_id: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  );
}

export function SwaggerGetAllNotificationsOfUser() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all notifications for a specific user' }),
    ApiParam({ name: 'userId', description: 'User ID' }),
    ApiQuery({
      name: 'is_read',
      required: false,
      type: Boolean,
      description: 'Filter by read status',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      type: String,
      description: 'Filter by notification type',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of notifications to retrieve',
    }),
    ApiQuery({
      name: 'skip',
      required: false,
      type: Number,
      description: 'Number of notifications to skip',
    }),
    ApiResponse({
      status: 200,
      description: 'List of notifications retrieved successfully',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nid: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            type: { type: 'string' },
            is_read: { type: 'boolean' },
            details_json: { type: 'string', nullable: true },
            related_type: { type: 'string', nullable: true },
            related_id: { type: 'string', nullable: true },
            user_id: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}

export function SwaggerGetMyNotifications() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all notifications for the current authenticated user' }),
    ApiQuery({
      name: 'is_read',
      required: false,
      type: Boolean,
      description: 'Filter by read status',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      type: String,
      description: 'Filter by notification type',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of notifications to retrieve',
    }),
    ApiQuery({
      name: 'skip',
      required: false,
      type: Number,
      description: 'Number of notifications to skip',
    }),
    ApiResponse({
      status: 200,
      description: 'List of notifications retrieved successfully',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nid: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            type: { type: 'string' },
            is_read: { type: 'boolean' },
            details_json: { type: 'string', nullable: true },
            related_type: { type: 'string', nullable: true },
            related_id: { type: 'string', nullable: true },
            user_id: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  );
}

export function SwaggerGetNotification() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a single notification by ID' }),
    ApiParam({ name: 'nid', description: 'Notification ID' }),
    ApiResponse({
      status: 200,
      description: 'Notification retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          nid: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string' },
          is_read: { type: 'boolean' },
          details_json: { type: 'string', nullable: true },
          related_type: { type: 'string', nullable: true },
          related_id: { type: 'string', nullable: true },
          user_id: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'Notification not found' }),
  );
}

export function SwaggerCreateNotification() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new notification (Lecturer/Admin only)' }),
    ApiResponse({
      status: 201,
      description: 'Notification created successfully',
      schema: {
        type: 'object',
        properties: {
          nid: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string' },
          is_read: { type: 'boolean' },
          details_json: { type: 'string', nullable: true },
          related_type: { type: 'string', nullable: true },
          related_id: { type: 'string', nullable: true },
          user_id: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Bad request' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 403, description: 'Forbidden - requires Lecturer or Admin role' }),
  );
}

export function SwaggerCreateBulkNotification() {
  return applyDecorators(
    ApiOperation({ summary: 'Create notifications for multiple users at once (Lecturer/Admin only)' }),
    ApiResponse({
      status: 201,
      description: 'Notifications created successfully for all recipients',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nid: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            type: { type: 'string' },
            is_read: { type: 'boolean' },
            details_json: { type: 'string', nullable: true },
            related_type: { type: 'string', nullable: true },
            related_id: { type: 'string', nullable: true },
            user_id: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Bad request - one or more users do not exist' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 403, description: 'Forbidden - requires Lecturer or Admin role' }),
  );
}

export function SwaggerCreateClassNotification() {
  return applyDecorators(
    ApiOperation({ summary: 'Create notifications for all students in a class (Lecturer/Admin only)' }),
    ApiParam({ name: 'clid', description: 'Class ID' }),
    ApiResponse({
      status: 201,
      description: 'Notifications created successfully for all students in the class',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nid: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            type: { type: 'string' },
            is_read: { type: 'boolean' },
            details_json: { type: 'string', nullable: true },
            related_type: { type: 'string', nullable: true },
            related_id: { type: 'string', nullable: true },
            user_id: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Bad request - class not found or no students in class' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 403, description: 'Forbidden - requires Lecturer or Admin role' }),
    ApiResponse({ status: 404, description: 'Class not found' }),
  );
}

export function SwaggerUpdateNotification() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a notification (Lecturer/Admin only)' }),
    ApiParam({ name: 'nid', description: 'Notification ID' }),
    ApiResponse({
      status: 200,
      description: 'Notification updated successfully',
      schema: {
        type: 'object',
        properties: {
          nid: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string' },
          is_read: { type: 'boolean' },
          details_json: { type: 'string', nullable: true },
          related_type: { type: 'string', nullable: true },
          related_id: { type: 'string', nullable: true },
          user_id: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Bad request' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'Notification not found' }),
  );
}

export function SwaggerDeleteNotification() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a notification' }),
    ApiParam({ name: 'nid', description: 'Notification ID' }),
    ApiResponse({
      status: 200,
      description: 'Notification deleted successfully',
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'Notification not found' }),
  );
}

export function SwaggerMarkAsRead() {
  return applyDecorators(
    ApiOperation({ summary: 'Mark a single notification as read' }),
    ApiParam({ name: 'nid', description: 'Notification ID' }),
    ApiResponse({
      status: 200,
      description: 'Notification marked as read',
      schema: {
        type: 'object',
        properties: {
          nid: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string' },
          is_read: { type: 'boolean' },
          details_json: { type: 'string', nullable: true },
          related_type: { type: 'string', nullable: true },
          related_id: { type: 'string', nullable: true },
          user_id: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'Notification not found' }),
  );
}

export function SwaggerMarkAllAsRead() {
  return applyDecorators(
    ApiOperation({ summary: 'Mark all notifications as read for current user' }),
    ApiResponse({
      status: 200,
      description: 'All notifications marked as read',
      schema: {
        type: 'object',
        properties: {
          count: { type: 'number', description: 'Number of notifications marked as read' },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  );
}

export function SwaggerGetUnread() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all unread notifications for current user' }),
    ApiResponse({
      status: 200,
      description: 'List of unread notifications retrieved successfully',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nid: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            type: { type: 'string' },
            is_read: { type: 'boolean' },
            details_json: { type: 'string', nullable: true },
            related_type: { type: 'string', nullable: true },
            related_id: { type: 'string', nullable: true },
            user_id: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  );
}

export function SwaggerGetUnreadCount() {
  return applyDecorators(
    ApiOperation({ summary: 'Get unread notifications count for current user' }),
    ApiResponse({
      status: 200,
      description: 'Unread count retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          count: { type: 'number', description: 'Number of unread notifications' },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  );
}
