import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: process.env.JWT_EXPIRES_IN as any },
    // signOptions: { expiresIn: "1h" },
  })],
  controllers: [UsersController],
  providers: [UsersService, PrismaService]
})
export class UsersModule {}
