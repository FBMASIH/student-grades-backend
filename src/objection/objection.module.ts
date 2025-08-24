import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from 'src/course/entities/course.entity';
import { User } from 'src/users/entities/user.entity';
import { Objection } from './entities/objection.entity';
import { ObjectionController } from './objection.controller';
import { ObjectionService } from './objection.service';
import { CourseGroup } from 'src/course-groups/entities/course-group.entity';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { Group } from 'src/groups/entities/group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Objection,
      Course,
      User,
      CourseGroup,
      Enrollment,
      Group,
    ]),
  ],
  controllers: [ObjectionController],
  providers: [ObjectionService],
})
export class ObjectionModule {}
