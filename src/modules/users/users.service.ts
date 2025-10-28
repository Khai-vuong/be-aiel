import { Injectable } from '@nestjs/common';
import { User } from 'generated/prisma';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UsersService {

    constructor (private readonly prisma: PrismaService) { }

    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany();
    }
}
