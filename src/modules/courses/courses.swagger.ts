import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CreateCourseDto, UpdateCourseDto } from './courses.dto';

export function SwaggerGetAllCourses() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get all courses',
      description: 'Retrieve a list of all courses with lecturer information and enrollment counts'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved all courses',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            cid: { type: 'string', example: 'course001' },
            code: { type: 'string', example: 'CS101' },
            name: { type: 'string', example: 'Introduction to Programming' },
            description: { type: 'string', example: 'Basic programming concepts' },
            credits: { type: 'number', example: 3 },
            lecturer_id: { type: 'string', example: 'lecturer_id_001' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            lecturer: { type: 'object' },
            _count: {
              type: 'object',
              properties: {
                enrollments: { type: 'number', example: 25 },
                classes: { type: 'number', example: 3 }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  );
}

export function SwaggerGetCourse() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get course by ID',
      description: 'Retrieve detailed information about a specific course including enrollments and classes'
    }),
    ApiParam({
      name: 'id',
      description: 'Course ID',
      example: 'course001'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved course',
      schema: {
        type: 'object',
        properties: {
          cid: { type: 'string', example: 'course001' },
          code: { type: 'string', example: 'CS101' },
          name: { type: 'string', example: 'Introduction to Programming' },
          description: { type: 'string', example: 'Basic programming concepts' },
          credits: { type: 'number', example: 3 },
          lecturer: { type: 'object' },
          enrollments: { type: 'array' },
          classes: { type: 'array' }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Course not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  );
}

export function SwaggerCreateCourse() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Create new course',
      description: 'Create a new course. Only accessible by Admin and Lecturer roles.'
    }),
    ApiBody({ type: CreateCourseDto }),
    ApiResponse({
      status: 201,
      description: 'Course successfully created',
      schema: {
        type: 'object',
        properties: {
          cid: { type: 'string', example: 'course_new_001' },
          code: { type: 'string', example: 'CS201' },
          name: { type: 'string', example: 'Data Structures' },
          description: { type: 'string', example: 'Advanced data structures' },
          credits: { type: 'number', example: 4 },
          lecturer_id: { type: 'string', example: 'lecturer_id_001' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      }
    }),
    ApiResponse({ status: 400, description: 'Bad Request - Invalid data or course code already exists' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  );
}

export function SwaggerUpdateCourse() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Update course',
      description: 'Update course information. Only accessible by Admin and course Lecturer.'
    }),
    ApiParam({
      name: 'id',
      description: 'Course ID to update',
      example: 'course001'
    }),
    ApiBody({ type: UpdateCourseDto }),
    ApiResponse({
      status: 200,
      description: 'Course successfully updated',
      schema: {
        type: 'object',
        properties: {
          cid: { type: 'string', example: 'course001' },
          code: { type: 'string', example: 'CS101' },
          name: { type: 'string', example: 'Updated Course Name' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      }
    }),
    ApiResponse({ status: 400, description: 'Bad Request - Invalid data' }),
    ApiResponse({ status: 404, description: 'Course not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  );
}

export function SwaggerDeleteCourse() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Delete course',
      description: 'Delete a course. Only accessible by Admin. Cannot delete courses with active enrollments.'
    }),
    ApiParam({
      name: 'id',
      description: 'Course ID to delete',
      example: 'course001'
    }),
    ApiResponse({
      status: 200,
      description: 'Course successfully deleted'
    }),
    ApiResponse({ status: 400, description: 'Bad Request - Cannot delete course with active enrollments' }),
    ApiResponse({ status: 404, description: 'Course not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (Admin role required)' })
  );
}

export function SwaggerGetCoursesByLecturer() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get courses by lecturer',
      description: 'Retrieve all courses taught by a specific lecturer'
    }),
    ApiParam({
      name: 'lecturerId',
      description: 'Lecturer ID',
      example: 'lecturer_id_001'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved courses',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            cid: { type: 'string' },
            code: { type: 'string' },
            name: { type: 'string' },
            _count: { type: 'object' }
          }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Lecturer not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  );
}

export function SwaggerGetEnrolledStudents() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get enrolled students',
      description: 'Retrieve all students enrolled in a specific course'
    }),
    ApiParam({
      name: 'courseId',
      description: 'Course ID',
      example: 'course001'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved enrolled students',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            enrollment_id: { type: 'string' },
            enrolled_at: { type: 'string', format: 'date-time' },
            status: { type: 'string', example: 'active' },
            student: {
              type: 'object',
              properties: {
                sid: { type: 'string' },
                name: { type: 'string' },
                major: { type: 'string' }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Course not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  );
}
