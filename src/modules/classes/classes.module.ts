import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { PrismaService } from 'src/prisma.service';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Module({
  imports: [MulterModule.register({
    storage: diskStorage({
      destination: (req, file, callback) => {
        const uploadPath = './uploads';
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        callback(null, uploadPath);
      },
      filename: (req, file, callback) => {
        const timestamp = Date.now();
        const ext = extname(file.originalname);
        const nameWithoutExt = file.originalname.replace(ext, '');
        callback(null, `${nameWithoutExt}-${timestamp}${ext}`);
      },
    }),
  })],
  controllers: [ClassesController],
  providers: [ClassesService, PrismaService]
})
export class ClassesModule {}
