import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { UsersRegisterDto, UsersLoginDto, UsersUpdateDto } from './users.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {

    constructor (
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService
    ) { }

    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany();
    }

    async findUserById(id: string): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { uid: id },
            include: { student: true, lecturer: true, admin: true }
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }
    async findStudentByUserId(userId: string): Promise<any> {
        return this.prisma.student.findUnique({
            where: { user_id: userId }
        });
    }

    async findLecturerByUserId(userId: string): Promise<any> {
        return this.prisma.lecturer.findUnique({
            where: { user_id: userId }
        });
    }

    async findAdminByUserId(userId: string): Promise<any> {
        return this.prisma.admin.findUnique({
            where: { user_id: userId }
        });
    }
    
    async register(registerDto: UsersRegisterDto): Promise<any> {
        if (registerDto.role === "Student") {
            return await this.prisma.user.create({
                data: {
                    username: registerDto.username,
                    hashed_password: registerDto.hashed_password,
                    role: registerDto.role,
                    status: "Active",
                    student: {
                        create: {
                            name: registerDto.name,
                            personal_info_json: registerDto.personal_info_json,
                            major: registerDto.major || "",
                        }
                    }
                },
                include: {
                    student: true,
                }
            });
        }
        else if (registerDto.role === "Lecturer") {
            return await this.prisma.user.create({
                data: {
                    username: registerDto.username,
                    hashed_password: registerDto.hashed_password,
                    role: registerDto.role,
                    status: "Active",
                    lecturer: {
                        create: {
                            name: registerDto.name,
                            personal_info_json: registerDto.personal_info_json,
                        }
                    }
                },
                include: {
                    lecturer: true,
                }
            });
        }
        else if (registerDto.role === "Admin") {
            return await this.prisma.user.create({
                data: {
                    username: registerDto.username,
                    hashed_password: registerDto.hashed_password,
                    role: registerDto.role,
                    status: "Active",
                    admin: {
                        create: {
                            name: registerDto.name,
                            personal_info: registerDto.personal_info_json,
                        }
                    }
                },
                include: {
                    admin: true,
                }
            });
        }
        else {
            throw new BadRequestException("Invalid role specified");
        }
    }

    async login(loginDto: UsersLoginDto): Promise<string> {
        const user = await this.prisma.user.findUnique({
            where: { username: loginDto.username }
        });

        if (!user) { throw new BadRequestException("Invalid username"); }
        else {
            if (user.hashed_password !== loginDto.hashed_password) {
                throw new BadRequestException("Invalid password");
            }
            
            this.prisma.user.update({
                where: {uid: user.uid},
                data: {status: "Active"}
            })

            const signPayload = {
                uid: user.uid,
                username: user.username,
                role: user.role,
            }
            return this.jwtService.signAsync(signPayload);
        }
    }

    async update(id: string, updateDto: UsersUpdateDto): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { uid: id }
        });

        if (!user) {
            throw new BadRequestException("User not found");
        }

        return this.prisma.$transaction( async (tx) => {
            const updatedBaseUser = await this.updateBaseUser(tx, id, updateDto);
            let roleSpecificData = null;
            
            switch (user.role) {
                case "Student":
                    roleSpecificData = await this.updateStudent(tx, id, updateDto);
                    return { ...updatedBaseUser, Student: roleSpecificData };
                case "Lecturer":
                    roleSpecificData = await this.updateLecturer(tx, id, updateDto);
                    return { ...updatedBaseUser, Lecturer: roleSpecificData };
                case "Admin":
                    roleSpecificData = await this.updateAdmin(tx, id, updateDto);
                    return { ...updatedBaseUser, Admin: roleSpecificData };
                default: throw new BadRequestException("Invalid user role");
            }
        })
    }
    
    private updateBaseUser(tx : any, id: string, dto: UsersUpdateDto) {
    return tx.user.update({
        where: { uid: id },
        data: {
        hashed_password: dto.hashed_password,
        status: dto.status,
        updated_at: new Date(),
        },
    });
    }

    private updateStudent(tx, id: string, dto: UsersUpdateDto) {
    return tx.student.update({
        where: { user_id: id },
        data: {
        personal_info_json: dto.personal_info_json,
        major: dto.major,
        }
    });
    }

    private updateLecturer(tx, id: string, dto: UsersUpdateDto) {
    return tx.lecturer.update({
        where: { user_id: id },
        data: {
        personal_info_json: dto.personal_info_json,
        },
    });
    }

    private updateAdmin(tx, id: string, dto: UsersUpdateDto) {
    return tx.admin.update({
        where: { user_id: id },
        data: {
        personal_info: dto.personal_info_json,
        },
    });
    }

    async delete(id: string): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { uid: id }
        });

        if (!user) {
            throw new BadRequestException("User not found");
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.user.delete({
                where: { uid: id }
            });
            const deleteStudent =  tx.student.deleteMany({
                where: { user_id: id }
            });
            const deleteLecturer =  tx.lecturer.deleteMany({
                where: { user_id: id }
            });
            const deleteAdmin =  tx.admin.deleteMany({
                where: { user_id: id }
            });
            await Promise.all([deleteStudent, deleteLecturer, deleteAdmin]);
        });
    }
}