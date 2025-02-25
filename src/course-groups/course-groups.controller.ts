import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
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
    @GetUser('id') userId: number,
  ) {
    return this.courseGroupsService.addStudents(
      +groupId,
      data.studentIds,
      userId,
    );
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

  @Get(':id/students-status')
  async getStudentsStatus(@Param('id', ParseIntPipe) id: number) {
    const courseGroup = await this.courseGroupsService.findOne(id);
    if (!courseGroup) {
      throw new NotFoundException(`Course group with ID ${id} not found`);
    }

    // Implement logic to get students status
    return this.courseGroupsService.getStudentsStatus(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCourseGroupDto: UpdateCourseGroupDto,
  ) {
    return this.courseGroupsService.update(+id, updateCourseGroupDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/professor')
  updateProfessor(
    @Param('id') id: number,
    @Body() body: { professorId: number },
  ) {
    return this.courseGroupsService.updateProfessor(id, body.professorId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/professor')
  removeProfessor(@Param('id') id: number) {
    return this.courseGroupsService.removeProfessor(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.courseGroupsService.remove(+id);
  }
}
