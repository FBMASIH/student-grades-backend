import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CourseGroupsService } from './course-groups.service';
import { CreateCourseGroupDto } from './dto/create-course-group.dto';
import { UpdateCourseGroupDto } from './dto/update-course-group.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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

  @Get()
  findAll() {
    return this.courseGroupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseGroupsService.findOne(+id);
  }

  @Get('course/:courseId')
  findAvailableGroups(@Param('courseId') courseId: string) {
    return this.courseGroupsService.findAvailableGroups(+courseId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCourseGroupDto: UpdateCourseGroupDto) {
    return this.courseGroupsService.update(+id, updateCourseGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.courseGroupsService.remove(+id);
  }
}
