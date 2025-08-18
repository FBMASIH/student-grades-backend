import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { Course } from 'src/course/entities/course.entity';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { Objection } from './entities/objection.entity';
import { ObjectionController } from './objection.controller';
import { ObjectionService } from './objection.service';
import { CourseAssignment } from 'src/course-assignments/entities/course-assignment.entity';
import { CourseGroup } from 'src/course-groups/entities/course-group.entity';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Objection,
      Course,
      User,
      CourseGroup,
      Enrollment,
    ]),
  ],
  controllers: [ObjectionController],
  providers: [ObjectionService, JwtService, AuthService, UsersService],
})
export class ObjectionModule {}
