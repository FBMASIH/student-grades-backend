import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { ManageStudentsDto } from './dto/manage-students.dto';
import { UpdateCourseGroupDto } from './dto/update-course-group.dto';
import { UsernamesDto } from './dto/usernames.dto';

@Controller('course-groups')
@UseGuards(JwtAuthGuard)
export class CourseGroupsController {
  constructor(private readonly courseGroupsService: CourseGroupsService) {}

  @Post()
  create(@Body() createCourseGroupDto: CreateCourseGroupDto) {
    return this.courseGroupsService.create(createCourseGroupDto);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.courseGroupsService.findAll(page, limit, search);
  }

  @Get('course/:courseId')
  findAvailableGroups(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.courseGroupsService.findAvailableGroups(courseId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courseGroupsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourseGroupDto: UpdateCourseGroupDto,
  ) {
    return this.courseGroupsService.update(id, updateCourseGroupDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.courseGroupsService.remove(id);
  }

  @Get(':groupId/students')
  getGroupStudents(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.courseGroupsService.getGroupStudents(groupId);
  }

  @Post(':groupId/students')
  addStudents(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() manageStudentsDto: ManageStudentsDto,
    @GetUser('id') userId: number,
  ) {
    return this.courseGroupsService.addStudents(
      groupId,
      manageStudentsDto.studentIds,
      userId,
    );
  }

  @Delete(':groupId/students')
  @HttpCode(HttpStatus.OK)
  removeStudents(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() manageStudentsDto: ManageStudentsDto,
  ) {
    return this.courseGroupsService.removeStudents(
      groupId,
      manageStudentsDto.studentIds,
    );
  }

  @Post(':groupId/students/usernames')
  addStudentsByUsernames(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() usernamesDto: UsernamesDto,
    @GetUser('id') userId: number,
  ) {
    return this.courseGroupsService.addStudentsByUsernames(
      groupId,
      usernamesDto.usernames,
      userId,
    );
  }

  @Post(':groupId/bulk-enroll')
  bulkEnroll(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() usernamesDto: UsernamesDto,
    @GetUser('id') userId: number,
  ) {
    return this.courseGroupsService.bulkEnroll(
      groupId,
      usernamesDto.usernames,
      userId,
    );
  }

  @Get(':groupId/available-students')
  getAvailableStudents(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query('search') search?: string,
  ) {
    return this.courseGroupsService.getAvailableStudents(groupId, search);
  }
}
