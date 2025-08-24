import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { Course } from './entities/course.entity';
import { CourseGroupsModule } from '../course-groups/course-groups.module';
import { CourseGroup } from '../course-groups/entities/course-group.entity';
import { User } from 'src/users/entities/user.entity';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { Group } from 'src/groups/entities/group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CourseGroup, User, Enrollment, Group]),
    CourseGroupsModule,
  ],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
