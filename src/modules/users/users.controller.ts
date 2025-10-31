import { Body, Controller, Get, Post, Put, Param, UseGuards, Request, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { LoginDto, RegisterDto, UpdateDto, AuthorizeDto } from './users.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';

@ApiTags('users')
@UseGuards(JwtGuard, RolesGuard)
@Controller('users')
export class UsersController {

    constructor(private readonly usersService: UsersService) { }

    @Get()
    @Roles('Admin')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ 
        summary: 'Get all users',
        description: 'Retrieve a list of all users in the system. Only accessible by Admin users.'
    })
    @ApiResponse({ 
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
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (Admin role required)' })
    async findAll() {
        return this.usersService.findAll();
    }

    @Post("auth/login")
    @Public()
    @ApiTags('auth')
    @ApiOperation({ 
        summary: 'User login',
        description: 'Authenticate user and receive JWT token for subsequent requests'
    })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ 
        status: 200, 
        description: 'Successfully authenticated',
        schema: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request - Invalid username or password' })
    async login(@Body() loginDto: LoginDto, @Request() req) {
        return this.usersService.login(loginDto);
    }

    @Get("profile")
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ 
        summary: 'Get current user profile',
        description: 'Retrieve the profile information of the currently authenticated user'
    })
    @ApiResponse({ 
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
                        personal_info_json: { type: 'string', example: '{"phone": "+1234567890"}' }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
    async getProfile(@Request() req) {
        return this.usersService.findUserById(req.user.uid);
    }

    @Post("auth/register")
    @Public()
    @ApiTags('auth')
    @ApiOperation({ 
        summary: 'Register new user',
        description: 'Create a new user account with the specified role (Student, Lecturer, or Admin)'
    })
    @ApiBody({ type: RegisterDto })
    @ApiResponse({ 
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
                        major: { type: 'string', example: 'Computer Science' }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data or username already exists' })
    async register(@Body() registerDto: RegisterDto) {
        return this.usersService.register(registerDto);
    }

    @Put("update/:id")
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ 
        summary: 'Update user information',
        description: 'Update user profile information including password, status, personal info, and role-specific data'
    })
    @ApiParam({ 
        name: 'id', 
        description: 'User ID to update', 
        example: 'user004' 
    })
    @ApiBody({ type: UpdateDto })
    @ApiResponse({ 
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
                        personal_info_json: { type: 'string', example: '{"phone": "+0987654321"}' }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request - User not found or invalid input data' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
    async update(@Param("id") id: string, @Body() updateDto: UpdateDto, @Request() req) {
        return (id) 
            ? this.usersService.update(id, updateDto) 
            : this.usersService.update(req.user.uid, updateDto);
    }

    @Delete("delete/:id")
    @Roles('Admin')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ 
        summary: 'Delete user',
        description: 'Delete a user and all associated role-specific data. Only accessible by Admin users.'
    })
    @ApiParam({ 
        name: 'id', 
        description: 'User ID to delete', 
        example: 'user005' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'User successfully deleted'
    })
    @ApiResponse({ status: 400, description: 'Bad Request - User not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions (Admin role required)' })
    async delete(@Param("id") id: string) {
        return this.usersService.delete(id);
    }

}
