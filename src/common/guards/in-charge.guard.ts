import { 
    Injectable, 
    CanActivate, 
    ExecutionContext, 
    ForbiddenException, 
    NotFoundException, 
    BadRequestException 
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class InChargeGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const classId = request.params.clid;
        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        if (!classId) {
            throw new BadRequestException('Class ID not provided');
        }

        // Check if user is a lecturer
        const lecturerSearch = this.prisma.lecturer.findUnique({
            where: { user_id: user.uid }
        });

        const classSearch = this.prisma.class.findUnique({
            where: { clid: classId }
        });

        const [lecturer, classData] = await Promise.all([lecturerSearch, classSearch]);
    
        if (!lecturer) {
            throw new NotFoundException('Only lecturers can add resources to classes');
        }

        if (!classData) {
            throw new NotFoundException(`Class with ID ${classId} not found`);
        }

        if (classData.lecturer_id !== lecturer.lid) {
            throw new ForbiddenException('You are not in charge of this class');
        }

        return true;
    }
}
