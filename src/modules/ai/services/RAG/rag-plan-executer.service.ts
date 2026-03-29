import { Injectable } from "@nestjs/common";
import {RagCapabilityExecution} from "./rag-planner.service";
import { PrismaService } from "src/prisma.service";

type LogRetrieveParams = {
    limit?: number;
    offset?: number;
    logType?: string;
};

type LogFromUserParams = {
    userId?: string;
    limit?: number;
    offset?: number;
};

@Injectable()
export class RagPlanExecuterService {
    constructor(
        private readonly prisma: PrismaService,
    ) {}

    private readonly handlers: Record<
        string,
        (step: RagCapabilityExecution) => Promise<any>
    > = {
        'log-retrive': (step) => this.executeLogRetrieve(step),
        'log-from-user': (step) => this.executeLogFromUser(step),
    };

    private toSafeNumber(value: unknown, fallback: number): number {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return fallback;
        }
        return Math.floor(parsed);
    }

    private async executeLogRetrieve(step: RagCapabilityExecution): Promise<any[]> {
        const params = (step.resolvedParameters ?? {}) as LogRetrieveParams;
        const limit = Math.min(this.toSafeNumber(params.limit, 100), 500);
        const offset = this.toSafeNumber(params.offset, 0);
        const logType = typeof params.logType === 'string' ? params.logType.trim() : '';

        return this.prisma.log.findMany({
            where: {
                ...(logType ? { action: logType } : {}),
            },
            orderBy: {
                created_at: 'desc',
            },
            skip: offset,
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
    }

    private async executeLogFromUser(step: RagCapabilityExecution): Promise<any[]> {
        const params = (step.resolvedParameters ?? {}) as LogFromUserParams;
        const userId = typeof params.userId === 'string' ? params.userId.trim() : '';
        const limit = Math.min(this.toSafeNumber(params.limit, 100), 500);
        const offset = this.toSafeNumber(params.offset, 0);
        
        if (!userId) {
            throw new Error('Missing required parameter: userId');
        }

        return this.prisma.log.findMany({
            where: {
                user_id: userId,
            },
            orderBy: {
                created_at: 'desc',
            },
            skip: offset,
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
    }

    async execute(steps: RagCapabilityExecution[]): Promise<Array<{ capabilityId: string; result: any }>> {
        return Promise.all(
            steps.map(async (step) => {
                const capabilityId =
                    step.capabilityId ||
                    (step as unknown as { id?: string }).id ||
                    '';

                const handler = this.handlers[capabilityId];
                if (!handler) {
                    throw new Error(`Unknown capability ID: ${capabilityId || 'undefined'}`);
                }

                const result = await handler(step);
                return { capabilityId, result };
            }),
        );
    }
}