import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { Enrollment } from './entities/enrollment.entity';
import { CourseGroupsModule } from '../course-groups/course-groups.module';
import { CourseGroup } from '../course-groups/entities/course-group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, CourseGroup]),
    CourseGroupsModule
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService]
})
export class EnrollmentModule {}
