import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { TestModule } from './modules/test/test.module';
import { ClassesModule } from './modules/classes/classes.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { AttemptsModule } from './modules/attempts/attempts.module';
import { RequestContextModule } from './common/context';
import { LogsModule } from './modules/logs/logs.module';

@Module({
  imports: [
    RequestContextModule,
    LogsModule,
    UsersModule,
    CoursesModule,
    TestModule,
    ClassesModule,
    QuizzesModule,
    AttemptsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
