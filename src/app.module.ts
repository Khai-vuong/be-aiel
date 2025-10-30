import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';

@Module({
  imports: [UsersModule, CoursesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
