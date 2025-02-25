import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CourseModule } from './course/course.module';
import { ObjectionModule } from './objection/objection.module';
import { UserModule } from './users/users.module';
import { CourseGroupsModule } from './course-groups/course-groups.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '3306'),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'student_courses',
      autoLoadEntities: true,
      synchronize: true,
    }),

    UserModule,
    CourseModule,
    TicketsModule,
    ObjectionModule,
    AuthModule,
    CourseGroupsModule,
    EnrollmentModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
