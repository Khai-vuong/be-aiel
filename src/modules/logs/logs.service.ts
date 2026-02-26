import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { getLogsFilter } from './logs.dto';
import { RequestContextService } from 'src/common/context';

@Injectable()
export class LogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContextService: RequestContextService,
  ) {}

  private getUserId(): string | undefined {
    const userId = this.requestContextService.getUserId();
    // console.log('[LogService.getUserId] Retrieved userId from context:', userId);
    return userId;
  }

  async createLog(
    action: string,
    uid: string,
    resourceType?: string,
    resourceId?: string,
  ): Promise<any> {
    // console.log(`Creating log: action=${action}, resourceType=${resourceType}, resourceId=${resourceId}, userId=${userId}`);
    return this.prisma.log.create({
      data: {
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        user_id: uid,
      },
    });
  }

  async getLogs(filters?: getLogsFilter): Promise<any[]> {
    return this.prisma.log.findMany({
      where: {
        user_id: filters?.userId,
        action: filters?.action,
        resource_type: filters?.resourceType,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: filters?.limit || 100,
    });
  }

  async getLogsByUser(userId: string, limit: number = 50): Promise<any[]> {
    return this.prisma.log.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });
  }

  async getLogsByAction(action: string, limit: number = 50): Promise<any[]> {
    return this.prisma.log.findMany({
      where: {
        action,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });
  }

  /**
   * 
   * This method has flaw. It retrives logs for all users in the class and filter logs by those users
   * Hence, it also retrive logs that are done by those users, but not in this class.
   * Also logs like login, profile update are not related to class but will be included if user is in the class.
   * 
   * Possible solution: build a related id list and filter by that. Though efficiency hell
   * 
   * For now I'm aint gonna do that, maybe later (or never LOL)
   */
  async getLogsByClass(
    classId: string,
    options: {
      page: number;
      limit: number;
      action?: string;
    },
  ): Promise<any> {
    const { page, limit, action } = options;
    const skip = (page - 1) * limit;

    // Get all students in the class
    const classWithStudents = await this.prisma.class.findUnique({
      where: { clid: classId },
      include: {
        students: {
          include: {
            user: true,
          },
        },
        lecturer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!classWithStudents) {
      throw new BadRequestException('Class not found');
    }

    // Get user IDs of all students and the lecturer
    const userIds = [
      ...classWithStudents.students.map((s) => s.user.uid),
      classWithStudents.lecturer.user.uid,
    ];

    // Build where clause
    const where: any = {
      user_id: { in: userIds },
    };

    if (action) {
      where.action = action;
    }

    // Get total count
    const total = await this.prisma.log.count({ where });

    // Get logs with pagination
    const logs = await this.prisma.log.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            uid: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllSystemLogs(options: {
    page: number;
    limit: number;
    action?: string;
    resourceType?: string;
    userId?: string;
  }): Promise<any> {
    const { page, limit, action, resourceType, userId } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (resourceType) {
      where.resource_type = resourceType;
    }

    if (userId) {
      where.user_id = userId;
    }

    // Get total count
    const total = await this.prisma.log.count({ where });

    // Get logs with pagination
    const logs = await this.prisma.log.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            uid: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
