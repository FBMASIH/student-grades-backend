import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CourseService } from './course.service';

@Controller('courses')
export class CourseController {
  constructor(private readonly coursesService: CourseService) {}

  @UseGuards(JwtAuthGuard)
  @Get('student/:id')
  getStudentCourses(@Param('id') studentId: number) {
    return this.coursesService.getStudentCourses(studentId);
  }

}
