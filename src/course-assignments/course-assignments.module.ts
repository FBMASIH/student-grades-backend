import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { User } from 'src/users/entities/user.entity';
import { UserModule } from 'src/users/users.module';
import { CourseAssignmentsController } from './course-assignments.controller';
import { CourseAssignmentsService } from './course-assignments.service';
import { CourseAssignment } from './entities/course-assignment.entity';
import { CourseGroup } from 'src/course-groups/entities/course-group.entity';
import { Group } from '../groups/entities/group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseAssignment,
      User,
      Enrollment,
      CourseGroup,
      Group,
    ]),
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
    UserModule,
  ],
  controllers: [CourseAssignmentsController],
  providers: [CourseAssignmentsService],
})
export class CourseAssignmentsModule {}
