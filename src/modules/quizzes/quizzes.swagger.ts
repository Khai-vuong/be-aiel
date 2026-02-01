import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CreateQuizDto, UpdateQuizDto } from './quizzes.dto';

export function SwaggerGetAllQuizzes() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get all quizzes',
      description: 'Retrieve a list of all quizzes with class information and counts'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved all quizzes',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            qid: { type: 'string', example: 'quiz001' },
            name: { type: 'string', example: 'Midterm Quiz' },
            description: { type: 'string', example: 'Covers chapters 1-5' },
            settings_json: {
              type: 'object',
              properties: {
                timeLimit: { type: 'number', example: 45 },
                maxAttempts: { type: 'number', example: 2 },
                shuffleQuestions: { type: 'boolean', example: true }
              }
            },
            status: { type: 'string', example: 'draft', enum: ['draft', 'published', 'archived'] },
            available_from: { type: 'string', format: 'date-time' },
            available_until: { type: 'string', format: 'date-time' },
            class_id: { type: 'string', example: 'class001' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            class: {
              type: 'object',
              properties: {
                clid: { type: 'string' },
                name: { type: 'string', example: 'CS101 - L1' },
                course: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'CS101' },
                    name: { type: 'string', example: 'Introduction to Programming' }
                  }
                }
              }
            },
            _count: {
              type: 'object',
              properties: {
                questions: { type: 'number', example: 10 },
                attempts: { type: 'number', example: 25 }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  );
}

export function SwaggerGetQuiz() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get quiz by ID',
      description: 'Retrieve detailed information about a specific quiz including questions'
    }),
    ApiParam({
      name: 'id',
      description: 'Quiz ID',
      example: 'quiz001'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved quiz',
      schema: {
        type: 'object',
        properties: {
          qid: { type: 'string', example: 'quiz001' },
          name: { type: 'string', example: 'Midterm Quiz' },
          description: { type: 'string', example: 'Covers chapters 1-5' },
          settings_json: {
            type: 'object',
            properties: {
              timeLimit: { type: 'number', example: 45 },
              maxAttempts: { type: 'number', example: 2 },
              shuffleQuestions: { type: 'boolean', example: true }
            }
          },
          status: { type: 'string', example: 'draft' },
          available_from: { type: 'string', format: 'date-time' },
          available_until: { type: 'string', format: 'date-time' },
          class: {
            type: 'object',
            properties: {
              clid: { type: 'string' },
              name: { type: 'string' },
              course: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  name: { type: 'string' }
                }
              },
              lecturer: {
                type: 'object',
                properties: {
                  name: { type: 'string' }
                }
              }
            }
          },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                qsid: { type: 'string' },
                question_text: { type: 'string' },
                question_type: { type: 'string' },
                points: { type: 'number' },
                order: { type: 'number' }
              }
            }
          },
          _count: {
            type: 'object',
            properties: {
              questions: { type: 'number' },
              attempts: { type: 'number' }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Quiz not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  );
}

export function SwaggerGetQuizzesByClass() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get quizzes by class ID',
      description: 'Retrieve all quizzes for a specific class'
    }),
    ApiParam({
      name: 'clid',
      description: 'Class ID',
      example: 'class001'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved quizzes for the class',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            qid: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            settings_json: {
              type: 'object',
              properties: {
                timeLimit: { type: 'number', example: 45 },
                maxAttempts: { type: 'number', example: 2 },
                shuffleQuestions: { type: 'boolean', example: true }
              }
            },
            status: { type: 'string' },
            available_from: { type: 'string', format: 'date-time' },
            available_until: { type: 'string', format: 'date-time' },
            _count: {
              type: 'object',
              properties: {
                questions: { type: 'number' },
                attempts: { type: 'number' }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Class not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  );
}

export function SwaggerCreateQuiz() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Create a new quiz',
      description: 'Create a new quiz for a class with optional questions. Class ID must be provided in the request body. Only accessible by Admin and Lecturer roles.'
    }),
    ApiBody({ type: CreateQuizDto }),
    ApiResponse({
      status: 201,
      description: 'Quiz successfully created',
      schema: {
        type: 'object',
        properties: {
          qid: { type: 'string', example: 'quiz001' },
          name: { type: 'string', example: 'Midterm Quiz' },
          description: { type: 'string', example: 'Covers chapters 1-5' },
          status: { type: 'string', example: 'draft' },
          available_from: { type: 'string', format: 'date-time' },
          available_until: { type: 'string', format: 'date-time' },
          class_id: { type: 'string', example: 'class001' },

          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ques_id: { type: 'string' },
                content: { type: 'string' },
                options_json: { type: 'string' },
                points: { type: 'number' }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 400, description: 'Bad Request - Invalid data, class not found, or invalid date range' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (Admin or Lecturer role required)' })
  );
}

export function SwaggerUpdateQuiz() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Update quiz',
      description: 'Update quiz information. Class ID can optionally be updated in the request body. Only accessible by Admin and Lecturer roles.'
    }),
    ApiParam({
      name: 'qid',
      description: 'Quiz ID to update',
      example: 'quiz001'
    }),
    ApiBody({ type: UpdateQuizDto }),
    ApiResponse({
      status: 200,
      description: 'Quiz successfully updated',
      schema: {
        type: 'object',
        properties: {
          qid: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string' },
          available_from: { type: 'string', format: 'date-time' },
          available_until: { type: 'string', format: 'date-time' },
          class_id: { type: 'string', example: 'class001' }
        }
      }
    }),
    ApiResponse({ status: 400, description: 'Bad Request - Invalid data or invalid date range' }),
    ApiResponse({ status: 404, description: 'Quiz not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (Admin or Lecturer role required)' })
  );
}

export function SwaggerDeleteQuiz() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Delete quiz',
      description: 'Delete a quiz (soft delete by archiving). Only accessible by Admin.'
    }),
    ApiParam({
      name: 'id',
      description: 'Quiz ID to delete',
      example: 'quiz001'
    }),
    ApiResponse({
      status: 200,
      description: 'Quiz successfully deleted (archived)',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Quiz with ID quiz001 deleted successfully' }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Quiz not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (Admin role required)' })
  );
}
