import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseGroupsService } from './course-groups.service';
import { CourseGroupsController } from './course-groups.controller';
import { CourseGroup } from './entities/course-group.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseGroup,User])],
  controllers: [CourseGroupsController],
  providers: [CourseGroupsService],
  exports: [CourseGroupsService]
})
export class CourseGroupsModule {}
