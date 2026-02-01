import { Module, Global } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogService } from './logs.service';
import { PrismaService } from 'src/prisma.service';
import { RequestContextService } from 'src/common/context';

@Global()
@Module({
  controllers: [LogsController],
  providers: [LogService, PrismaService, RequestContextService],
  exports: [LogService],
})
export class LogsModule {}
