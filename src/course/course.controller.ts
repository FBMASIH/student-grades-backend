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
    return this.coursesService.getAllCourses(page, limit, search);
  }

  @Post()
  createCourse(
    @Body()
    data: {
      name: string;
      code: string;
      units: number;
      department?: string;
    },
  ) {
    return this.coursesService.createCourse(data);
  }

  @Patch(':id')
  updateCourse(
    @Param('id') id: number,
    @Body()
    data: {
      name?: string;
      code?: string;
      units?: number;
      department?: string;
    },
  ) {
    return this.coursesService.updateCourse(id, data);
  }

  @Delete(':id')
  deleteCourse(@Param('id') id: number) {
    return this.coursesService.deleteCourse(id);
  }

  @Get(':id')
  getCourseById(@Param('id') id: number) {
    return this.coursesService.getCourse(id);
  }

  @Get('student/:id')
  getStudentCourses(@Param('id') studentId: number) {
    return this.coursesService.getStudentCourses(studentId);
  }

  @Get('professor/:id')
  getProfessorCourses(@Param('id') professorId: number) {
    return this.coursesService.getProfessorCourses(professorId);
  }
}
