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

export function SwaggerGetMyClasses() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get my classes',
      description: 'Retrieve classes for the current authenticated user (Student or Lecturer)'
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved user classes',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            clid: { type: 'string', example: 'class001' },
            name: { type: 'string', example: 'CS101 - L1' },
            schedule_json: {
              type: 'object',
              properties: {
                day: { type: 'string', example: 'Monday' },
                start: { type: 'string', example: '09:00' },
                end: { type: 'string', example: '11:00' }
              }
            },
            location: { type: 'string', example: 'Computer Science Building - Room 101' },
            status: { type: 'string', example: 'Active' },
            course_id: { type: 'string', example: 'course001' },
            lecturer_id: { type: 'string', example: 'lecturer001' },
            created_at: { type: 'object' },
            updated_at: { type: 'object' },
            course: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Introduction to Programming' }
              }
            },
            lecturer: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Dr. John Smith' }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Only Student and Lecturer roles can access this endpoint' })
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

export function SwaggerUploadFile() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Upload file to class',
      description: `Upload a file resource to a class. The file will be stored in local storage (development) or AWS S3 (production) based on NODE_ENV. 

**Storage Behavior:**
- Development (NODE_ENV !== 'production'): Files saved to ./uploads folder on disk
- Production (NODE_ENV === 'production'): Files uploaded to AWS S3 bucket and local temp file deleted after upload

**Supported File Types:** Images, Videos, Documents (PDF, Word, etc.)

**Access Control:** Only the lecturer assigned to the class can upload files (enforced by InChargeGuard)`
    }),
    ApiParam({
      name: 'clid',
      description: 'Class ID to upload file to',
      example: 'class001'
    }),
    ApiResponse({
      status: 201,
      description: 'File successfully uploaded',
      schema: {
        type: 'object',
        properties: {
          fid: { type: 'string', example: 'file001', description: 'Unique file ID' },
          filename: { type: 'string', example: 'lecture-notes.pdf', description: 'Stored filename' },
          original_name: { type: 'string', example: 'Chapter 1 Notes.pdf', description: 'Original filename from upload' },
          url: { type: 'string', example: 'https://bucket.s3.region.amazonaws.com/class-files/class001/1234567890-file.pdf', description: 'File URL (local path or S3 URL)' },
          size: { type: 'number', example: 1024576, description: 'File size in bytes' },
          mime_type: { type: 'string', example: 'application/pdf', description: 'MIME type of the file' },
          file_type: { type: 'string', example: 'document', enum: ['image', 'video', 'document'], description: 'General file category' },
          is_public: { type: 'boolean', example: true, description: 'Whether file is publicly accessible' },
          class_id: { type: 'string', example: 'class001', description: 'Associated class ID' },
          uploader_id: { type: 'string', example: 'user001', description: 'ID of user who uploaded the file' },
          created_at: { type: 'string', format: 'date-time', description: 'Upload timestamp' }
        }
      }
    }),
    ApiResponse({ status: 400, description: 'Bad Request - Invalid file type, size exceeds limit, or S3 upload failed' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Only the assigned lecturer can upload files to this class' }),
    ApiResponse({ status: 404, description: 'Class not found' })
  );
}

export function SwaggerDownloadFile() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Download file from class',
      description: `Download a file from a class. The download method depends on storage location:

**Local Storage (Development):**
- Direct file download via Express res.download()
- Returns file stream with proper Content-Disposition headers

**S3 Storage (Production):**
- Returns JSON with signed URL valid for 1 hour
- Client must use the signed URL to download directly from S3
- Reduces server load and bandwidth

**Access Control:** Students, Lecturers, and Admins can download class files`
    }),
    ApiParam({
      name: 'clid',
      description: 'Class ID',
      example: 'class001'
    }),
    ApiParam({
      name: 'fid',
      description: 'File ID to download',
      example: 'file001'
    }),
    ApiResponse({
      status: 200,
      description: 'File download initiated (local) or signed URL returned (S3)',
      schema: {
        oneOf: [
          {
            type: 'object',
            description: 'S3 Response (Production)',
            properties: {
              file: {
                type: 'object',
                properties: {
                  fid: { type: 'string', example: 'file001' },
                  filename: { type: 'string', example: 'lecture-notes.pdf' },
                  original_name: { type: 'string', example: 'Chapter 1 Notes.pdf' },
                  size: { type: 'number', example: 1024576 },
                  mime_type: { type: 'string', example: 'application/pdf' },
                  file_type: { type: 'string', example: 'document' }
                }
              },
              downloadUrl: { 
                type: 'string', 
                example: 'https://bucket.s3.region.amazonaws.com/class-files/class001/file.pdf?X-Amz-Algorithm=...&X-Amz-Expires=3600',
                description: 'Pre-signed S3 URL valid for 1 hour'
              }
            }
          },
          {
            type: 'string',
            format: 'binary',
            description: 'Local file download (Development) - Direct file stream'
          }
        ]
      }
    }),
    ApiResponse({ status: 400, description: 'Bad Request - Invalid S3 URL format or failed to generate download URL' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions to access this file' }),
    ApiResponse({ status: 404, description: 'File not found' })
  );
}
