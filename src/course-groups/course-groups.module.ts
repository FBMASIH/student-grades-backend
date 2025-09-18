import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../course/entities/course.entity';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { User } from '../users/entities/user.entity';
import { CourseGroupsController } from './course-groups.controller';
import { CourseGroupsService } from './course-groups.service';
import { CourseGroup } from './entities/course-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseGroup, User, Enrollment, Course])],
  controllers: [CourseGroupsController],
  providers: [CourseGroupsService],
  exports: [CourseGroupsService],
})
export class CourseGroupsModule {}
