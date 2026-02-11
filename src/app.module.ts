import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';

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
    NotificationsModule,
    AiModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
})
export class AppModule {}
