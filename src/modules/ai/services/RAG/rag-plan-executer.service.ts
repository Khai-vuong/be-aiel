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

const toTableCell = (value: unknown): string => {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
    ) {
        return String(value);
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

export function flattenJsonToTable(
    tableName: string,
    data: Record<string, any> | Array<Record<string, any>>,
): string {
    const safeTableName = (tableName || 'TABLE').toUpperCase();
    const rows = Array.isArray(data) ? data : [data];

    if (rows.length === 0) {
        return `[${safeTableName}]\n`;
    }

    const headerSet = new Set<string>();
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            headerSet.add(key);
        }
    }
    const headerKeys = Array.from(headerSet);

    const header = headerKeys.join(' | ');
    const body = rows
        .map((row) =>
            headerKeys.map((key) => toTableCell(row[key])).join('|'),
        )
        .join('\n');

    return body
        ? `[${safeTableName}] ${header} ${body}`
        : `[${safeTableName}] ${header}`;
}

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

    private async executeLogRetrieve(step: RagCapabilityExecution): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as LogRetrieveParams;
        const limit = Math.min(this.toSafeNumber(params.limit, 100), 500);
        const offset = this.toSafeNumber(params.offset, 0);
        const logType = typeof params.logType === 'string' ? params.logType.trim() : '';

        const fetchLogs = await this.prisma.log.findMany({
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
                    },
                },
            },
        });

        const users = new Set(fetchLogs.map((log) => log.user.uid));
        const userData = await this.prisma.user.findMany({
            where: {
                uid: { in: Array.from(users) },
            },
            select: {
                uid: true,
                username: true,
                role: true,
            },
        });


        return flattenJsonToTable('Logs', fetchLogs) + '\n' + flattenJsonToTable('Users', userData);
    }

    private async executeLogFromUser(step: RagCapabilityExecution): Promise<any> {
        const params = (step.resolvedParameters ?? {}) as LogFromUserParams;
        const userId = typeof params.userId === 'string' ? params.userId.trim() : '';
        const limit = Math.min(this.toSafeNumber(params.limit, 100), 500);
        const offset = this.toSafeNumber(params.offset, 0);
        
        if (!userId) {
            throw new Error('Missing required parameter: userId');
        }

        const fetchUser = this.prisma.user.findUnique({
            where: { uid: userId },
            select: { 
                uid: true,
                username: true,
                role: true,
            },
        })

        const fetchLogs = this.prisma.log.findMany({
            where: {
                user_id: userId,
            },
            select: {
                action: true,
                resource_type: true,
                resource_id: true,
                created_at: true,
            },
            orderBy: {
                created_at: 'desc',
            },
            skip: offset,
            take: limit,
        });

        const [user, logs] = await Promise.all([fetchUser, fetchLogs]);

        return flattenJsonToTable('User', user!) + '\n' + flattenJsonToTable('Logs', logs);
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