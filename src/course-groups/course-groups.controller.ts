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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CourseGroupsService } from './course-groups.service';
import { CreateCourseGroupDto } from './dto/create-course-group.dto';
import { UpdateCourseGroupDto } from './dto/update-course-group.dto';

@Controller('course-groups')
@UseGuards(JwtAuthGuard)
export class CourseGroupsController {
  constructor(private readonly courseGroupsService: CourseGroupsService) {}

  @Post()
  create(@Body() createCourseGroupDto: CreateCourseGroupDto) {
    return this.courseGroupsService.create(createCourseGroupDto);
  }

  @Post(':groupId/enroll/:studentId')
  enrollStudent(
    @Param('groupId') groupId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.courseGroupsService.enrollStudent(+groupId, +studentId);
  }

  @Post(':groupId/students')
  async addStudents(
    @Param('groupId') groupId: string,
    @Body() data: { studentIds: number[] },
  ) {
    return this.courseGroupsService.addStudents(+groupId, data.studentIds);
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.courseGroupsService.findAll(page, limit, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseGroupsService.findOne(+id);
  }

  @Get('course/:courseId')
  findAvailableGroups(@Param('courseId') courseId: string) {
    return this.courseGroupsService.findAvailableGroups(+courseId);
  }

  @Get(':groupId/students')
  async getGroupStudents(@Param('groupId') groupId: string) {
    return this.courseGroupsService.getGroupStudents(+groupId);
  }

  @Get(':groupId/students-status')
  async getGroupStudentsStatus(@Param('groupId') groupId: string) {
    return this.courseGroupsService.getGroupStudentsStatus(+groupId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCourseGroupDto: UpdateCourseGroupDto,
  ) {
    return this.courseGroupsService.update(+id, updateCourseGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.courseGroupsService.remove(+id);
  }
}
