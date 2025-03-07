import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../course/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { Enrollment } from './entities/enrollment.entity';
import { CourseAssignmentRepository } from '../course-assignments/course-assignment.repository'; // Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Enrollment,
      Course,
      User,
      CourseAssignmentRepository, // Add this repository
    ]),
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
