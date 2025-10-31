import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { TestService } from './test.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [TestController],
  providers: [TestService, PrismaService]
})
export class TestModule {}
