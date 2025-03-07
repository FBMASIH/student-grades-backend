import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-grade.dto';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CourseController {
  constructor(private readonly coursesService: CourseService) {}

  @Get()
  getAllCourses(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.coursesService.getAllCourses({ page, limit, search });
  }

  @Post()
  createCourse(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  @Patch(':id')
  updateCourse(@Param('id') id: number, @Body() updateCourseDto: any) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  deleteCourse(@Param('id') id: number) {
    return this.coursesService.deleteCourse(id);
  }

  @Get(':id')
  getCourseById(@Param('id') id: number) {
    return this.coursesService.getCourse(id);
  }

  @Get(':id/students')
  getCourseStudents(@Param('id') courseId: number) {
    return this.coursesService.getCourseStudents(courseId);
  }

  @Get('student/:id')
  getStudentCourses(@Param('id') studentId: number) {
    return this.coursesService.getStudentCourses(studentId);
  }

  @Get('professor/:id')
  getProfessorCourses(@Param('id') professorId: number) {
    return this.coursesService.getTeacherCourses(professorId);
  }

  @Get('teacher/:id/details')
  async getTeacherCoursesDetails(@Param('id') teacherId: number) {
    return this.coursesService.getTeacherCoursesDetails(teacherId);
  }
}
