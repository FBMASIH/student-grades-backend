import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseAssignmentsController } from './course-assignments.controller';
import { CourseAssignmentsService } from './course-assignments.service';
import { CourseAssignment } from './entities/course-assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseAssignment])],
  controllers: [CourseAssignmentsController],
  providers: [CourseAssignmentsService],
})
export class CourseAssignmentsModule {}
