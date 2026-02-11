import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';

// UsersLoginDto
// 
// Example object:
// {
//   "username": "student1",
//   "hashed_password": "student123"
// }
export class UsersLoginDto {
    @ApiProperty({ description: 'Username for login', example: 'student1' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ description: 'Password for login (hashed)', example: 'student123' })
    @IsString()
    @IsNotEmpty()
    @MinLength(process.env.PASSWORD_MIN_LENGTH ? parseInt(process.env.PASSWORD_MIN_LENGTH) : 6)
    hashed_password: string;
}

// UserLoginResponseDto
// 
// Response object returned after successful login
// Example object:
// {
//   "userToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJ1c2VyMDAxIiwidXNlcm5hbWUiOiJzdHVkZW50MSIsInJvbGUiOiJTdHVkZW50In0...",
//   "role": "Student"
// }
export class UserLoginResponseDto {
    @ApiProperty({ 
        description: 'JWT token for authentication. Include this token in the Authorization header as "Bearer <token>" for subsequent requests.', 
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJ1c2VyMDAxIiwidXNlcm5hbWUiOiJzdHVkZW50MSIsInJvbGUiOiJTdHVkZW50In0...'
    })
    userToken: string = "";

    @ApiProperty({ 
        description: 'User role in the system', 
        enum: ['Student', 'Lecturer', 'Admin'], 
        example: 'Student' 
    })
    role: string = "";

    @ApiProperty({ 
        description: 'roleID corresponding to the user role (e.g., studentId, lecturerId, adminId)', 
        example: 'student123 or lecturer456 or admin789'
    })
    roleId: string = "";    
}

// UsersRegisterDto
// 
// Example object:
// {
//   "username": "newstudent",
//   "email": "student@university.edu",
//   "hashed_password": "password123",
//   "role": "Student",
//   "name": "John Doe",
//   "personal_info_json": "{\"address\": \"123 Main St\", \"phone\": \"+1234567890\", \"dob\": \"2000-01-01\"}",
//   "major": "Computer Science"
// }
export class UsersRegisterDto {
    @ApiProperty({ description: 'Unique username', example: 'newstudent' })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    username: string;

    @ApiProperty({ description: 'User email address', example: 'student@university.edu' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ description: 'Password (will be hashed)', example: 'password123' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    hashed_password: string;

    @ApiProperty({ description: 'User role in the system', enum: ['Student', 'Lecturer', 'Admin'], example: 'Student' })
    @IsEnum(['Student', 'Lecturer', 'Admin'])
    @IsNotEmpty()
    role: "Student" | "Lecturer" | "Admin";

    @ApiProperty({ description: 'Full name of the user', example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Personal information in JSON format', example: '{"address": "123 Main St", "phone": "+1234567890", "dob": "2000-01-01"}' })
    @IsString()
    @IsNotEmpty()
    personal_info_json: string;

    @ApiProperty({ description: 'Major field of study (for students)', example: 'Computer Science', required: false })
    @IsString()
    @IsOptional()
    major?: string;
}

// UsersUpdateDto
// 
// Example object (all fields are optional):
// {
//   "hashed_password": "newpassword123",
//   "status": "Active",
//   "personal_info_json": "{\"address\": \"456 New St\", \"phone\": \"+0987654321\"}",
//   "major": "Mathematics"
// }
export class UsersUpdateDto {
    @ApiProperty({ description: 'New password (hashed)', example: 'newpassword123', required: false })
    @IsString()
    @IsOptional()
    @MinLength(6)
    hashed_password?: string;

    @ApiProperty({ description: 'User status', enum: ['Active', 'Logged_out', 'Expelled', 'Graduated'], example: 'Active', required: false })
    @IsEnum(['Active', 'Logged_out', 'Expelled', 'Graduated'])
    @IsOptional()
    status?: "Active" | "Logged_out" | "Expelled" | "Graduated";

    @ApiProperty({ description: 'Updated personal information in JSON format', example: '{"address": "456 New St", "phone": "+0987654321"}', required: false })
    @IsString()
    @IsOptional()
    personal_info_json?: string;

    @ApiProperty({ description: 'Updated major field of study', example: 'Mathematics', required: false })
    @IsString()
    @IsOptional()
    major?: string;
}

// export class AuthorizeDto {
//     @ApiProperty({
//         description: 'Current role of the user',
//         enum: ['Admin', 'Lecturer', 'Student'],
//         example: 'Student'
//     })
//     currentRole: "Admin" | "Lecturer" | "Student";

//     @ApiProperty({
//         description: 'New role to assign to the user',
//         enum: ['Admin', 'Lecturer', 'Student'],
//         example: 'Lecturer'
//     })
//     newRole: "Admin" | "Lecturer" | "Student";
// }