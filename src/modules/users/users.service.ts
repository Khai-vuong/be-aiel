import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { UsersRegisterDto, UsersLoginDto, UsersUpdateDto, UserLoginResponseDto } from './users.dto';
import { JwtService } from '@nestjs/jwt';
import { LogService } from '../logs';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class UsersService {

    constructor (
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly logService: LogService,
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
        //This route doesn't require authentication, so we need explicit uid in logging
        if (registerDto.role === "Student") {
            const newUser = await this.prisma.user.create({
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
            // createLog('action', 'uid', 'resourceType', 'resourceId')
            await this.logService.createLog('create_user', newUser.uid, 'User', newUser.uid);
            return newUser;
        }
        else if (registerDto.role === "Lecturer") {
            const newUser = await this.prisma.user.create({
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
            await this.logService.createLog('create_user', newUser.uid, 'User', newUser.uid);
            return newUser;
        }
        else if (registerDto.role === "Admin") {
            const newUser = await this.prisma.user.create({
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
            await this.logService.createLog('create_user', newUser.uid, 'User', newUser.uid);
            return newUser;
        }
        else {
            throw new BadRequestException("Invalid role specified");
        }
    }

    async login(loginDto: UsersLoginDto): Promise<UserLoginResponseDto> {
        const user = await this.prisma.user.findUnique({
            where: { username: loginDto.username },
            include: { student: true, lecturer: true, admin: true }
        });

        if (!user) { throw new BadRequestException("Invalid username"); }
        else {
            if (user.hashed_password !== loginDto.hashed_password) {
                throw new BadRequestException("Invalid password");
            }

            if (user.status === "Deleted") {
                throw new BadRequestException("User account is deleted");
            }
            
            // this.prisma.user.update({
            //     where: {uid: user.uid},
            //     data: {status: "Active"}
            // })

            let roleId = "";
            if (user.role === "Student" && user.student) {
                roleId = user.student.sid;
            }
            else if (user.role === "Lecturer" && user.lecturer) {
                roleId = user.lecturer.lid;
            }
            else if (user.role === "Admin" && user.admin) {
                roleId = user.admin.aid;
            }

            const signPayload = {
                uid: user.uid,
                username: user.username,
                role: user.role,
                roleId: roleId
            }
            
            const userToken = await this.jwtService.signAsync(signPayload);
            return {
                userToken: userToken,
                role: user.role,
                roleId: roleId
            };
        }
    }

    async update(user: JwtPayload, id: string, updateDto: UsersUpdateDto): Promise<any> {
        const existingUser = await this.prisma.user.findUnique({
            where: { uid: id }
        });

        if (!existingUser) {
            throw new BadRequestException("User not found");
        }

        const result = await this.prisma.$transaction( async (tx) => {
            const updatedBaseUser = await this.updateBaseUser(tx, id, updateDto);
            let roleSpecificData = null;
            
            switch (existingUser.role) {
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
        });

        await this.logService.createLog('update_user', user.uid, 'User', id);
        return result;
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

    async delete(user: JwtPayload, id: string): Promise<any> {
        const existingUser = await this.prisma.user.findUnique({
            where: { uid: id }
        });

        if (!existingUser) {
            throw new BadRequestException("User not found");
        }

        // return this.prisma.$transaction(async (tx) => {
        //     await tx.user.delete({
        //         where: { uid: id }
        //     });
        //     const deleteStudent =  tx.student.deleteMany({
        //         where: { user_id: id }
        //     });
        //     const deleteLecturer =  tx.lecturer.deleteMany({
        //         where: { user_id: id }
        //     });
        //     const deleteAdmin =  tx.admin.deleteMany({
        //         where: { user_id: id }
        //     });
        //     await Promise.all([deleteStudent, deleteLecturer, deleteAdmin]);
        // });

        const result = await this.prisma.user.update({
            where: {uid : id},
            data: {status: "Deleted"},
        });

        await this.logService.createLog('delete_user', user.uid, 'User', id);
        return result;
    }
}