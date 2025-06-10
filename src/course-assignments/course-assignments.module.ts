import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CourseAssignmentsController } from './course-assignments.controller';
import { CourseAssignmentsService } from './course-assignments.service';
import { CourseAssignment } from './entities/course-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CourseAssignment, User, Enrollment]),
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  ],
  controllers: [CourseAssignmentsController],
  providers: [CourseAssignmentsService, UsersService],
})
export class CourseAssignmentsModule {}
