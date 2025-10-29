import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from 'generated/prisma';
import { PrismaService } from 'src/prisma.service';
import { type RegisterDto, type LoginDto, AuthorizeDto } from './users.dto';

@Injectable()
export class UsersService {

    constructor (private readonly prisma: PrismaService) { }

    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany();
    }
    
    async register(registerDto: RegisterDto): Promise<any> {
        const newUser = await this.prisma.user.create( {
            data: {
                username: registerDto.username,
                hashed_password: registerDto.hashed_password,
                role: registerDto.role,
                status: "Active",
            }
        })

        if (registerDto.role === "Student") {
            const newStudent = await this.prisma.student.create({
                data: {
                    name: registerDto.name,
                    personal_info_json: registerDto.personal_info_json,
                    major: registerDto.major || "",
                    user: { connect: { uid: newUser.uid } }
                }
            })
            return { ...newUser, Student: newStudent}
        }
        else if (registerDto.role === "Lecturer") {
            const newLecturer = await this.prisma.lecturer.create({
                data: {
                    name: registerDto.name,
                    personal_info_json: registerDto.personal_info_json,
                    user: { connect: { uid: newUser.uid } }
                }
            })
            return { ...newUser, Lecturer: newLecturer}
        }
        else if (registerDto.role === "Admin") {
            const newAdmin = await this.prisma.admin.create({
                data: {
                    name: registerDto.name,
                    personal_info: registerDto.personal_info_json,
                    user: { connect: { uid: newUser.uid } }
                }
            })
            return { ...newUser, Admin: newAdmin}
        }
        else {
            throw new BadRequestException("Invalid role specified");
        }

    }

    async login(loginDto: LoginDto): Promise<User> {
        const user = await this.prisma.user.findUnique({
            where: { username: loginDto.username }
        });

        if (!user) { throw new BadRequestException("Invalid username"); }
        else {
            if (user.hashed_password === loginDto.hashed_password) {
                return user;
            } else throw new BadRequestException("Invalid password");
        }

        throw new BadRequestException("Invalid username or password");
    }

    async update(id: string, updateDto: any): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { uid: id }
        });

        if (!user) {
            throw new BadRequestException("User not found");
        }

        const updatedUser = await this.prisma.user.update({
            where: { uid: id },
            data: {
                hashed_password: updateDto.hashed_password,
                status: updateDto.status,
                updated_at: new Date()
            }
        });

        if (user.role === "Student" && updateDto.personal_info_json) {
            await this.prisma.student.update({
                where: { sid: id },
                data: { personal_info_json: updateDto.personal_info_json }
            });
        }
        else if (user.role === "Lecturer" && updateDto.personal_info_json) {
            await this.prisma.lecturer.update({
                where: { lid: id },
                data: { personal_info_json: updateDto.personal_info_json }
            });
        }
        else if (user.role === "Admin" && updateDto.personal_info_json) {
            await this.prisma.admin.update({
                where: { aid: id },
                data: { personal_info: updateDto.personal_info_json }
            });
        }
        else { throw new BadRequestException("Invalid role specified"); }

        return {...updatedUser, personal_info_json: updateDto.personal_info_json};
    }

    async authorize(id: string, authorizeDto: AuthorizeDto): Promise<User> {
        const user = await this.prisma.user.findUnique({
            where: { uid: id },
            include: {
                Student: true,
                Lecturer: true,
                Admin: true
            }
        });

        if (!user) {
            throw new BadRequestException("User not found");
        }

        // Verify current role matches
        if (user.role !== authorizeDto.currentRole) {
            throw new BadRequestException(`Current role mismatch. Expected ${authorizeDto.currentRole}, but user has ${user.role}`);
        }

        // If the new role is the same as current role, no change needed
        if (authorizeDto.currentRole === authorizeDto.newRole) {
            return user;
        }

        // Delete current role-specific record
        if (authorizeDto.currentRole === "Student" && user.Student) {
            await this.prisma.student.delete({
                where: { sid: user.Student.sid }
            });
        } else if (authorizeDto.currentRole === "Lecturer" && user.Lecturer) {
            await this.prisma.lecturer.delete({
                where: { lid: user.Lecturer.lid }
            });
        } else if (authorizeDto.currentRole === "Admin" && user.Admin) {
            await this.prisma.admin.delete({
                where: { aid: user.Admin.aid }
            });
        }

        // Update user role
        const updatedUser = await this.prisma.user.update({
            where: { uid: id },
            data: { role: authorizeDto.newRole }
        });

        // Create new role-specific record with default values
        if (authorizeDto.newRole === "Student") {
            await this.prisma.student.create({
                data: {
                    name: user.Student?.name || user.Lecturer?.name || user.Admin?.name || "Unknown",
                    major: "Undeclared",
                    personal_info_json: user.Student?.personal_info_json || user.Lecturer?.personal_info_json || user.Admin?.personal_info || "{}",
                    user: { connect: { uid: user.uid } }
                }
            });
        } else if (authorizeDto.newRole === "Lecturer") {
            await this.prisma.lecturer.create({
                data: {
                    name: user.Student?.name || user.Lecturer?.name || user.Admin?.name || "Unknown",
                    personal_info_json: user.Student?.personal_info_json || user.Lecturer?.personal_info_json || user.Admin?.personal_info || "{}",
                    user: { connect: { uid: user.uid } }
                }
            });
        } else if (authorizeDto.newRole === "Admin") {
            await this.prisma.admin.create({
                data: {
                    name: user.Student?.name || user.Lecturer?.name || user.Admin?.name || "Unknown",
                    personal_info: user.Student?.personal_info_json || user.Lecturer?.personal_info_json || user.Admin?.personal_info || "{}",
                    user: { connect: { uid: user.uid } }
                }
            });
        }

        return updatedUser;
    }
}