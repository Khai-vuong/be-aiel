import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ClassCreateDto, ResponseCreateClassDto } from './classes.dto';

export function SwaggerGetAllClasses() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get all classes',
      description: 'Retrieve a list of all classes with course, lecturer, students, and counts information'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved all classes',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            clid: { type: 'string', example: 'class001' },
            name: { type: 'string', example: 'CS101 - L1' },
            schedule_json: { type: 'string', example: '{"day": "Monday", "start": "09:00", "end": "11:00"}' },
            location: { type: 'string', example: 'Computer Science Building - Room 101' },
            status: { type: 'string', example: 'Active' },
            course_id: { type: 'string', example: 'course001' },
            lecturer_id: { type: 'string', example: 'lecturer001' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            course: {
              type: 'object',
              properties: {
                cid: { type: 'string' },
                code: { type: 'string', example: 'CS101' },
                name: { type: 'string', example: 'Introduction to Programming' },
                credits: { type: 'number', example: 3 }
              }
            },
            lecturer: {
              type: 'object',
              properties: {
                lid: { type: 'string' },
                name: { type: 'string', example: 'Dr. John Smith' }
              }
            },
            students: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sid: { type: 'string' },
                  name: { type: 'string' },
                  major: { type: 'string' }
                }
              }
            },
            _count: {
              type: 'object',
              properties: {
                students: { type: 'number', example: 25 },
                files: { type: 'number', example: 5 },
                quizzes: { type: 'number', example: 2 }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  );
}

export function SwaggerGetClass() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get class by ID',
      description: 'Retrieve detailed information about a specific class including course, lecturer, students, files, and quizzes'
    }),
    ApiParam({
      name: 'id',
      description: 'Class ID',
      example: 'class001'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved class',
      schema: {
        type: 'object',
        properties: {
          clid: { type: 'string', example: 'class001' },
          name: { type: 'string', example: 'CS101 - L1' },
          schedule_json: { type: 'string', example: '{"day": "Monday", "start": "09:00", "end": "11:00"}' },
          location: { type: 'string', example: 'Computer Science Building - Room 101' },
          status: { type: 'string', example: 'Active' },
          course: {
            type: 'object',
            properties: {
              cid: { type: 'string' },
              code: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              credits: { type: 'number' }
            }
          },
          lecturer: {
            type: 'object',
            properties: {
              lid: { type: 'string' },
              name: { type: 'string' },
              personal_info_json: { type: 'string' }
            }
          },
          students: { type: 'array' },
          files: { type: 'array' },
          quizzes: { type: 'array' }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Class not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  );
}

export function SwaggerUpdateClass() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Update class',
      description: 'Update class information. Only accessible by Admin and Lecturer roles.'
    }),
    ApiParam({
      name: 'id',
      description: 'Class ID to update',
      example: 'class001'
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'CS101 - L1 (Updated)' },
          schedule_json: { type: 'string', example: '{"day": "Tuesday", "start": "10:00", "end": "12:00"}' },
          location: { type: 'string', example: 'Science Building - Room 205' },
          status: { type: 'string', example: 'Active', enum: ['Active', 'Cancelled', 'Completed'] },
          lecturer_id: { type: 'string', example: 'lecturer002' }
        }
      }
    }),
    ApiResponse({
      status: 200,
      description: 'Class successfully updated',
      schema: {
        type: 'object',
        properties: {
          clid: { type: 'string', example: 'class001' },
          name: { type: 'string', example: 'CS101 - L1 (Updated)' },
          schedule_json: { type: 'string' },
          location: { type: 'string' },
          status: { type: 'string' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      }
    }),
    ApiResponse({ status: 400, description: 'Bad Request - Invalid data or lecturer not found' }),
    ApiResponse({ status: 404, description: 'Class not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (Admin or Lecturer role required)' })
  );
}

export function SwaggerDeleteClass() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Delete class',
      description: 'Delete a class. Only accessible by Admin. Cannot delete classes with students, files, or quizzes.'
    }),
    ApiParam({
      name: 'id',
      description: 'Class ID to delete',
      example: 'class001'
    }),
    ApiResponse({
      status: 200,
      description: 'Class successfully deleted',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Class with ID class001 deleted successfully' }
        }
      }
    }),
    ApiResponse({ status: 400, description: 'Bad Request - Cannot delete class with students, files, or quizzes' }),
    ApiResponse({ status: 404, description: 'Class not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (Admin role required)' })
  );
}

export function SwaggerProcessEnrollments() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Create classes from pending enrollments',
      description: 'Process all pending course enrollments and automatically create classes. Groups students by course and creates multiple classes based on the maxStudentsPerClass limit. Students are automatically assigned to classes via many-to-many relationship. Only Admin can access this endpoint.'
    }),
    ApiBody({ type: ClassCreateDto }),
    ApiResponse({
      status: 201,
      description: 'Successfully processed pending enrollments and created classes',
      type: ResponseCreateClassDto,
      schema: {
        type: 'object',
        properties: {
          number_of_enrollments_processed: { type: 'number', example: 12, description: 'Total number of enrollments that were processed' },
          number_of_classes_created: { type: 'number', example: 3, description: 'Total number of classes created' },
          maximum_students_per_class: { type: 'number', example: 5, description: 'Maximum number of students allowed per class' },
          created_classes: {
            type: 'array',
            description: 'Details of all created classes',
            items: {
              type: 'object',
              properties: {
                classId: { type: 'string', example: 'class001', description: 'Unique class ID' },
                className: { type: 'string', example: 'CS101 - L1', description: 'Class name' },
                courseCode: { type: 'string', example: 'CS101', description: 'Course code' },
                courseName: { type: 'string', example: 'Introduction to Programming', description: 'Course name' },
                studentCount: { type: 'number', example: 5, description: 'Number of students in this class' },
                students: {
                  type: 'array',
                  description: 'List of students assigned to this class',
                  items: {
                    type: 'object',
                    properties: {
                      studentId: { type: 'string', example: 'student001', description: 'Student ID' },
                      studentName: { type: 'string', example: 'Alice Johnson', description: 'Student name' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ 
      status: 200, 
      description: 'No pending enrollments to process',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'No pending enrollments to process' },
          number_of_classes_created: { type: 'number', example: 0 },
          number_of_enrollments_processed: { type: 'number', example: 0 }
        }
      }
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Only Admin can process enrollments and create classes' })
  );
}
