import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

export function SwaggerGetClassLogs() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get logs for a specific class (Lecturer only)',
      description: `Retrieve activity logs for all students and the lecturer in a specific class. 
      
**Access Control:** 
- Only the lecturer assigned to the class can access these logs (enforced by InChargeGuard)
- Admins can access logs for any class

**Features:**
- Pagination support with customizable page size
- Filter logs by action type
- Returns user information with each log entry
- Ordered by newest first (created_at desc)`
    }),
    ApiParam({
      name: 'clid',
      description: 'Class ID to retrieve logs for',
      example: 'class001'
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (default: 1)',
      example: 1
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Items per page (default: 20, max: 100)',
      example: 20
    }),
    ApiQuery({
      name: 'action',
      required: false,
      type: String,
      description: 'Filter by action type (e.g., login, create_quiz, submit_attempt)',
      example: 'submit_attempt'
    }),
    ApiResponse({
      status: 200,
      description: 'Logs retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                logid: { type: 'string', example: 'log001' },
                action: { type: 'string', example: 'submit_attempt' },
                resource_type: { type: 'string', example: 'Attempt' },
                resource_id: { type: 'string', example: 'attempt001' },
                user_id: { type: 'string', example: 'user001' },
                created_at: { type: 'string', format: 'date-time' },
                user: {
                  type: 'object',
                  properties: {
                    uid: { type: 'string', example: 'user001' },
                    username: { type: 'string', example: 'john_doe' },
                    role: { type: 'string', example: 'Student' }
                  }
                }
              }
            }
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'number', example: 1 },
              limit: { type: 'number', example: 20 },
              total: { type: 'number', example: 156 },
              totalPages: { type: 'number', example: 8 }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 400, description: 'Bad Request - Class not found or invalid class ID' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Not in charge of this class' })
  );
}

export function SwaggerGetAllSystemLogs() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get all system logs (Admin only)',
      description: `Retrieve all activity logs across the entire system with advanced filtering options.

**Access Control:** 
- Only Admins can access this endpoint

**Features:**
- Full pagination support
- Multiple filter options: action, resourceType, userId
- Returns user information with each log entry
- Ordered by newest first (created_at desc)
- Useful for system monitoring and audit trails`
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (default: 1)',
      example: 1
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Items per page (default: 20, max: 100)',
      example: 20
    }),
    ApiQuery({
      name: 'action',
      required: false,
      type: String,
      description: 'Filter by action type (e.g., login, logout, create_quiz, delete_quiz)',
      example: 'login'
    }),
    ApiQuery({
      name: 'resourceType',
      required: false,
      type: String,
      description: 'Filter by resource type (e.g., User, Quiz, Attempt, Course, Class)',
      example: 'Quiz'
    }),
    ApiQuery({
      name: 'userId',
      required: false,
      type: String,
      description: 'Filter by specific user ID',
      example: 'user001'
    }),
    ApiResponse({
      status: 200,
      description: 'Logs retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                logid: { type: 'string', example: 'log001' },
                action: { type: 'string', example: 'create_quiz' },
                resource_type: { type: 'string', example: 'Quiz' },
                resource_id: { type: 'string', example: 'quiz001' },
                user_id: { type: 'string', example: 'user001' },
                created_at: { type: 'string', format: 'date-time' },
                user: {
                  type: 'object',
                  properties: {
                    uid: { type: 'string', example: 'user001' },
                    username: { type: 'string', example: 'lecturer_smith' },
                    role: { type: 'string', example: 'Lecturer' }
                  }
                }
              }
            }
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'number', example: 1 },
              limit: { type: 'number', example: 20 },
              total: { type: 'number', example: 2543 },
              totalPages: { type: 'number', example: 128 }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  );
}
