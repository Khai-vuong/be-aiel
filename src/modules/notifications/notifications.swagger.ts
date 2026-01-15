import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

export function SwaggerGetAllNotifications() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all notifications for current user' }),
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
    ApiParam({ name: 'id', description: 'Notification ID' }),
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

export function SwaggerUpdateNotification() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a notification' }),
    ApiParam({ name: 'id', description: 'Notification ID' }),
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
    ApiParam({ name: 'id', description: 'Notification ID' }),
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
    ApiParam({ name: 'id', description: 'Notification ID' }),
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
