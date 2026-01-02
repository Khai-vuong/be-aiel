import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CourseCreateDto, CourseUpdateDto } from './courses.dto';

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
    ApiBody({ type: CourseCreateDto }),
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
    ApiBody({ type: CourseUpdateDto }),
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

export function SwaggerRegisterToCourse() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Register to course',
      description: 'Register the authenticated student to a course. If already enrolled before, reactivates the enrollment with "Pending" status.'
    }),
    ApiParam({
      name: 'id',
      description: 'Course ID to register for',
      example: 'course001'
    }),
    ApiResponse({
      status: 201,
      description: 'Successfully registered to course or reactivated existing enrollment',
      schema: {
        type: 'object',
        properties: {
          ceid: { type: 'string', example: 'enrollment_001' },
          student_id: { type: 'string', example: 'student001' },
          course_id: { type: 'string', example: 'course001' },
          enrolled_at: { type: 'string', format: 'date-time' },
          status: { type: 'string', example: 'Pending' },
          student: {
            type: 'object',
            properties: {
              sid: { type: 'string' },
              name: { type: 'string' },
              major: { type: 'string' }
            }
          },
          course: {
            type: 'object',
            properties: {
              cid: { type: 'string' },
              code: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Course or Student not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Only Students can register for courses' })
  );
}

export function SwaggerUnregisterFromCourse() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Unregister from course',
      description: 'Unregister the authenticated student from a course. Changes enrollment status to "Unregistered" (soft delete).'
    }),
    ApiParam({
      name: 'id',
      description: 'Course ID to unregister from',
      example: 'course001'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully unregistered from course',
      schema: {
        type: 'object',
        properties: {
          ceid: { type: 'string', example: 'enrollment_001' },
          student_id: { type: 'string', example: 'student001' },
          course_id: { type: 'string', example: 'course001' },
          enrolled_at: { type: 'string', format: 'date-time' },
          status: { type: 'string', example: 'Unregistered' },
          student: {
            type: 'object',
            properties: {
              sid: { type: 'string' },
              name: { type: 'string' },
              major: { type: 'string' }
            }
          },
          course: {
            type: 'object',
            properties: {
              cid: { type: 'string' },
              code: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 400, description: 'Bad Request - Student is not enrolled in this course' }),
    ApiResponse({ status: 404, description: 'Course or Student not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Only Students can unregister from courses' })
  );
}



export function SwaggerAddLecturer() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Add lecturer to course',
      description: 'Add a lecturer to teach a course. Only accessible by Admin.'
    }),
    ApiParam({
      name: 'courseId',
      description: 'Course ID',
      example: 'course001'
    }),
    ApiParam({
      name: 'lecturerId',
      description: 'Lecturer ID to add',
      example: 'lecturer002'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully added lecturer to course',
      schema: {
        type: 'object',
        properties: {
          cid: { type: 'string', example: 'course001' },
          code: { type: 'string', example: 'CS101' },
          name: { type: 'string', example: 'Introduction to Programming' },
          lecturers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                lid: { type: 'string' },
                name: { type: 'string' }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Course or Lecturer not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Only Admin can add lecturers to courses' })
  );
}

export function SwaggerRemoveLecturer() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Remove lecturer from course',
      description: 'Remove a lecturer from teaching a course. Only accessible by Admin.'
    }),
    ApiParam({
      name: 'courseId',
      description: 'Course ID',
      example: 'course001'
    }),
    ApiParam({
      name: 'lecturerId',
      description: 'Lecturer ID to remove',
      example: 'lecturer002'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully removed lecturer from course',
      schema: {
        type: 'object',
        properties: {
          cid: { type: 'string', example: 'course001' },
          code: { type: 'string', example: 'CS101' },
          name: { type: 'string', example: 'Introduction to Programming' },
          lecturers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                lid: { type: 'string' },
                name: { type: 'string' }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 400, description: 'Lecturer is not teaching this course' }),
    ApiResponse({ status: 404, description: 'Course not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Only Admin can remove lecturers from courses' })
  );
}

export function SwaggerGetMyEnrollments() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get my enrollments',
      description: 'Retrieve all course enrollments for the authenticated student user.'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved student enrollments',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ceid: { type: 'string', example: 'enrollment001' },
            student_id: { type: 'string', example: 'student001' },
            course_id: { type: 'string', example: 'course001' },
            enrolled_at: { type: 'string', format: 'date-time' },
            status: { type: 'string', example: 'Pending', enum: ['Pending', 'Completed', 'Unregistered'] }
          }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Student not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Only Students can access their enrollments' })
  );
}

export function SwaggerGetMyCourses() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get my courses',
      description: 'Retrieve all courses taught by the authenticated lecturer user.'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved lecturer courses',
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
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Lecturer not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Only Lecturers can access their courses' })
  );
}
