import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

interface UpdateDto {
    status?: string;
    hashed_password?: string;
}

@Injectable()
export class TestService {

    constructor(private readonly prisma: PrismaService) { }

    async testUpdate(updateDto: UpdateDto) {
        // Example test update: Update all users' status to "Inactive"
        const updatedUsers = await this.prisma.user.update({
            where: {uid : "cmhd9hgi00008ve30hskfe0qi"},
            data: {
                status: updateDto.status,
                hashed_password: updateDto.hashed_password,

            }
        });


        console.log('updateDto:', updateDto);
        console.log(updateDto.hashed_password);
        return updatedUsers;
    }
}
