import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { TestModule } from './modules/test/test.module';

@Module({
  imports: [UsersModule, CoursesModule, TestModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
