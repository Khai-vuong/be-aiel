import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
    // Default allowed MIME types for e-learning platform
    private readonly defaultAllowedTypes = [
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'text/plain',
        'text/csv',
        
        // Images
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        
        // Videos
        'video/mp4',
        'video/mpeg',
        'video/webm',
        'video/quicktime', // .mov
        'video/x-msvideo', // .avi
        
        // Audio
        'audio/mpeg', // .mp3
        'audio/wav',
        'audio/ogg',
        'audio/mp4', // .m4a
        
        // Archives
        'application/zip',
        'application/x-zip-compressed',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        
        // Code files
        'text/html',
        'text/css',
        'text/javascript',
        'application/json',
        'application/xml',
        'text/xml',
    ];

    private readonly defaultMaxSizeMb = 300; // 300MB default

    constructor(
        private readonly customMimeTypes?: string[],
        private readonly customMaxSizeMb?: number
    ) {}

    transform(file: Express.Multer.File): Express.Multer.File {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Merge default and custom MIME types (remove duplicates)
        const allowedTypes = this.customMimeTypes ? this.customMimeTypes : this.defaultAllowedTypes;

        // Use custom size or default
        const maxSizeMb = this.customMaxSizeMb ?? this.defaultMaxSizeMb;
        const maxSizeBytes = maxSizeMb * 1024 * 1024;

        // Validate MIME type
        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `File type "${file.mimetype}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`
            );
        }

        // Validate file size
        if (file.size > maxSizeBytes) {
            throw new BadRequestException(
                `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${maxSizeMb}MB`
            );
        }

        return file;
    }
}
