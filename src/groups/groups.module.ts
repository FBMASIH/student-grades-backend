import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseAssignment } from '../course-assignments/entities/course-assignment.entity';
import { CourseGroup } from '../course-groups/entities/course-group.entity';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { Group } from './entities/group.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Group,
      Enrollment,
      CourseAssignment,
      CourseGroup,
    ]),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
