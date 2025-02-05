import { Module } from '@nestjs/common';
import { CourseGroupsService } from './course-groups.service';
import { CourseGroupsController } from './course-groups.controller';

@Module({
  controllers: [CourseGroupsController],
  providers: [CourseGroupsService],
})
export class CourseGroupsModule {}
