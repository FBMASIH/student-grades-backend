import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { UserSubscriber } from './common/subscribers/user-subscriber';
import { CourseAssignmentsModule } from './course-assignments/course-assignments.module';
import { CourseGroupsModule } from './course-groups/course-groups.module';
import { CourseModule } from './course/course.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { Enrollment } from './enrollment/entities/enrollment.entity';
import { GroupsModule } from './groups/groups.module';
import { ObjectionModule } from './objection/objection.module';
import { ScoresController } from './scores/scores.controller';
import { ScoresService } from './scores/scores.service';
import { TicketsModule } from './tickets/tickets.module';
import { UserModule } from './users/users.module';

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
    TypeOrmModule.forFeature([Enrollment]),

    UserModule,
    CourseModule,
    TicketsModule,
    ObjectionModule,
    AuthModule,
    CourseGroupsModule,
    EnrollmentModule,
    GroupsModule,
    CourseAssignmentsModule,
  ],
  controllers: [ScoresController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    UserSubscriber,
    ScoresService,
  ],
})
export class AppModule {}
