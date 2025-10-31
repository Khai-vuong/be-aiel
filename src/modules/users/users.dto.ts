import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({
        description: 'Username for login',
        example: 'student1'
    })
    username: string;

    @ApiProperty({
        description: 'Password for login (hashed)',
        example: 'student123'
    })
    hashed_password: string;
}

export class RegisterDto {
    @ApiProperty({
        description: 'Unique username',
        example: 'newstudent'
    })
    username: string;

    @ApiProperty({
        description: 'User email address',
        example: 'student@university.edu'
    })
    email: string;

    @ApiProperty({
        description: 'Password (will be hashed)',
        example: 'password123'
    })
    hashed_password: string;

    @ApiProperty({
        description: 'User role in the system',
        enum: ['Student', 'Lecturer', 'Admin'],
        example: 'Student'
    })
    role: "Student" | "Lecturer" | "Admin";

    @ApiProperty({
        description: 'Full name of the user',
        example: 'John Doe'
    })
    name: string;

    @ApiProperty({
        description: 'Personal information in JSON format',
        example: '{"address": "123 Main St", "phone": "+1234567890", "dob": "2000-01-01"}'
    })
    personal_info_json: string;

    @ApiProperty({
        description: 'Major field of study (for students)',
        example: 'Computer Science',
        required: false
    })
    major?: string;
}

export class UpdateDto {
    @ApiProperty({
        description: 'New password (hashed)',
        example: 'newpassword123',
        required: false
    })
    hashed_password?: string;

    @ApiProperty({
        description: 'User status',
        enum: ['Active', 'Logged_out', 'Expelled', 'Graduated'],
        example: 'Active',
        required: false
    })
    status?: "Active" | "Logged_out" | "Expelled" | "Graduated";

    @ApiProperty({
        description: 'Updated personal information in JSON format',
        example: '{"address": "456 New St", "phone": "+0987654321"}',
        required: false
    })
    personal_info_json?: string;

    @ApiProperty({
        description: 'Updated major field of study',
        example: 'Mathematics',
        required: false
    })
    major?: string;
}

export class AuthorizeDto {
    @ApiProperty({
        description: 'Current role of the user',
        enum: ['Admin', 'Lecturer', 'Student'],
        example: 'Student'
    })
    currentRole: "Admin" | "Lecturer" | "Student";

    @ApiProperty({
        description: 'New role to assign to the user',
        enum: ['Admin', 'Lecturer', 'Student'],
        example: 'Lecturer'
    })
    newRole: "Admin" | "Lecturer" | "Student";
}