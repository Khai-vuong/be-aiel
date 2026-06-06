import { Injectable } from '@nestjs/common';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GeminiProvider } from '../ai/providers/gemini.provider';
import { s3Client } from 'src/common/utils/s3.client';
import { PrismaService } from 'src/prisma.service';

interface UpdateDto {
    status?: string;
    hashed_password?: string;
}

type GeminiFileSummaryResult = {
    fid: string;
    fileName: string;
    fileUrl: string;
    provider: string;
    response: string;
};

@Injectable()
export class TestService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly geminiProvider: GeminiProvider,
    ) { }

    private isS3Url(url: string): boolean {
        try {
            const parsed = new URL(url);
            return parsed.hostname.includes('.s3.') || parsed.hostname.startsWith('s3.');
        } catch {
            return false;
        }
    }

    private parseS3BucketAndKey(rawUrl: string): { bucket: string; key: string } | null {
        try {
            const parsed = new URL(rawUrl);

            if (parsed.hostname.startsWith('s3.')) {
                const pathSegments = parsed.pathname.split('/').filter(Boolean);
                const bucket = pathSegments.shift();
                const key = pathSegments.join('/');

                if (bucket && key) {
                    return { bucket, key: decodeURIComponent(key) };
                }

                return null;
            }

            const hostnameParts = parsed.hostname.split('.');
            const bucket = hostnameParts[0];
            const key = parsed.pathname.replace(/^\//, '');

            if (bucket && key) {
                return { bucket, key: decodeURIComponent(key) };
            }

            return null;
        } catch {
            return null;
        }
    }

    private async signS3Url(rawUrl: string, filename: string): Promise<string> {
        if (!this.isS3Url(rawUrl)) {
            return rawUrl;
        }

        const bucketAndKey = this.parseS3BucketAndKey(rawUrl);
        if (!bucketAndKey) {
            return rawUrl;
        }

        const command = new GetObjectCommand({
            Bucket: bucketAndKey.bucket,
            Key: bucketAndKey.key,
            ResponseContentDisposition: `attachment; filename="${filename}"`,
        });

        return getSignedUrl(s3Client, command, { expiresIn: 60 });
    }

    async summarizeFileById(fid: string): Promise<GeminiFileSummaryResult> {
        const file = await this.prisma.file.findUnique({
            where: { fid },
            select: {
                fid: true,
                filename: true,
                original_name: true,
                url: true,
                mime_type: true,
            },
        });

        if (!file) {
            throw new Error(`File not found: ${fid}`);
        }

        const fileName = file.original_name || file.filename;
        const signedUrl = await this.signS3Url(file.url, fileName);

        const response = await this.geminiProvider.chat(
            'Hãy tóm tắt cho tôi nội dung trong file này',
            {
                temperature: 0.2,
                systemPrompt: [
                    'Bạn là trợ lý tóm tắt tài liệu.',
                    'Hãy trả lời ngắn gọn, rõ ràng, bằng tiếng Việt.',
                    'Chỉ dựa trên nội dung của file được cung cấp.',
                ].join('\n'),
                fileContext: {
                    url: signedUrl,
                    mime_type: file.mime_type || 'application/octet-stream',
                    filename: fileName,
                },
            },
        );

        return {
            fid: file.fid,
            fileName,
            fileUrl: signedUrl,
            provider: 'gemini',
            response,
        };
    }

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
