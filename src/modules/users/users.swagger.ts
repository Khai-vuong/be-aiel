import { applyDecorators } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiParam, 
  ApiBody 
} from '@nestjs/swagger';
import { UsersLoginDto, UsersRegisterDto, UsersUpdateDto } from './users.dto';

// Swagger decorator for Get All Users endpoint
export function SwaggerGetAllUsers() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ 
      summary: 'Get all users',
      description: 'Retrieve a list of all users in the system. Only accessible by Admin users.'
    }),
    ApiResponse({ 
      status: 200, 
      description: 'Successfully retrieved all users',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            uid: { type: 'string', example: 'user001' },
            username: { type: 'string', example: 'admin' },
            status: { type: 'string', example: 'Active' },
            role: { type: 'string', example: 'Admin' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (Admin role required)' })
  );
}

// Swagger decorator for Login endpoint
export function SwaggerLogin() {
  return applyDecorators(
    ApiTags('auth'),
    ApiOperation({ 
      summary: 'User login',
      description: 'Authenticate user and receive JWT token for subsequent requests'
    }),
    ApiBody({ type: UsersLoginDto }),
    ApiResponse({ 
      status: 200, 
      description: 'Successfully authenticated',
      schema: {
        type: 'string',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }),
    ApiResponse({ status: 400, description: 'Bad Request - Invalid username or password' })
  );
}

// Swagger decorator for Get Profile endpoint
export function SwaggerGetProfile() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ 
      summary: 'Get current user profile',
      description: 'Retrieve the profile information of the currently authenticated user'
    }),
    ApiResponse({ 
      status: 200, 
      description: 'Successfully retrieved user profile',
      schema: {
        type: 'object',
        properties: {
          uid: { type: 'string', example: 'user004' },
          username: { type: 'string', example: 'student1' },
          status: { type: 'string', example: 'Active' },
          role: { type: 'string', example: 'Student' },
          Student: {
            type: 'object',
            properties: {
              sid: { type: 'string', example: 'student_id_001' },
              name: { type: 'string', example: 'Alice Johnson' },
              major: { type: 'string', example: 'Computer Science' },
              personal_info_json: { 
                type: 'object', 
                example: { phone: '+1234567890', address: '789 Student St' }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  );
}

// Swagger decorator for Register endpoint
export function SwaggerRegister() {
  return applyDecorators(
    ApiTags('auth'),
    ApiOperation({ 
      summary: 'Register new user',
      description: 'Create a new user account with the specified role (Student, Lecturer, or Admin)'
    }),
    ApiBody({ type: UsersRegisterDto }),
    ApiResponse({ 
      status: 201, 
      description: 'User successfully created',
      schema: {
        type: 'object',
        properties: {
          uid: { type: 'string', example: 'user006' },
          username: { type: 'string', example: 'newstudent' },
          status: { type: 'string', example: 'Active' },
          role: { type: 'string', example: 'Student' },
          Student: {
            type: 'object',
            properties: {
              sid: { type: 'string' },
              name: { type: 'string', example: 'John Doe' },
              major: { type: 'string', example: 'Computer Science' },
              personal_info_json: { 
                type: 'object', 
                example: { phone: '+1234567890', address: '123 Main St' }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 400, description: 'Bad Request - Invalid input data or username already exists' })
  );
}

// Swagger decorator for Update User endpoint
export function SwaggerUpdateUser() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ 
      summary: 'Update user information',
      description: 'Update user profile information including password, status, personal info, and role-specific data'
    }),
    ApiParam({ 
      name: 'id', 
      description: 'User ID to update', 
      example: 'user004' 
    }),
    ApiBody({ type: UsersUpdateDto }),
    ApiResponse({ 
      status: 200, 
      description: 'User successfully updated',
      schema: {
        type: 'object',
        properties: {
          uid: { type: 'string', example: 'user004' },
          username: { type: 'string', example: 'student1' },
          status: { type: 'string', example: 'Active' },
          role: { type: 'string', example: 'Student' },
          updated_at: { type: 'string', format: 'date-time' },
          Student: {
            type: 'object',
            properties: {
              major: { type: 'string', example: 'Mathematics' },
              personal_info_json: { 
                type: 'object', 
                example: { phone: '+0987654321', address: '456 Updated St' }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 400, description: 'Bad Request - User not found or invalid input data' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  );
}

// Swagger decorator for Delete User endpoint
export function SwaggerDeleteUser() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ 
      summary: 'Delete user',
      description: 'Delete a user and all associated role-specific data. Only accessible by Admin users.'
    }),
    ApiParam({ 
      name: 'id', 
      description: 'User ID to delete', 
      example: 'user005' 
    }),
    ApiResponse({ 
      status: 200, 
      description: 'User successfully deleted'
    }),
    ApiResponse({ status: 400, description: 'Bad Request - User not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
    ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (Admin role required)' })
  );
}

// Swagger decorator for Get User by ID endpoint
export function SwaggerGetUserById() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ 
      summary: 'Get user by ID',
      description: 'Retrieve detailed information about a specific user by their ID'
    }),
    ApiParam({ 
      name: 'id', 
      description: 'User ID to retrieve', 
      example: 'user004' 
    }),
    ApiResponse({ 
      status: 200, 
      description: 'Successfully retrieved user',
      schema: {
        type: 'object',
        properties: {
          uid: { type: 'string', example: 'user004' },
          username: { type: 'string', example: 'student1' },
          status: { type: 'string', example: 'Active' },
          role: { type: 'string', example: 'Student' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          Student: {
            type: 'object',
            properties: {
              sid: { type: 'string', example: 'student_id_001' },
              name: { type: 'string', example: 'Alice Johnson' },
              major: { type: 'string', example: 'Computer Science' },
              personal_info_json: { 
                type: 'object', 
                example: { phone: '+1234567890', address: '789 Student St' }
              }
            }
          }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Not Found - User not found' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  );
}
