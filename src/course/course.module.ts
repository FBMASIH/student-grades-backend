import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { Course } from './entities/course.entity';
import { CourseGroupsModule } from '../course-groups/course-groups.module';
import { CourseGroup } from '../course-groups/entities/course-group.entity';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CourseGroup, User]),
    CourseGroupsModule
  ],
  controllers: [CourseController],
  providers: [CourseService, AuthService, UsersService, JwtService],
  exports: [CourseService]
})
export class CourseModule {}
