import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { CourseAssignmentsService } from './course-assignments.service';
import { CreateCourseAssignmentDto } from './dto/create-course-assignment.dto';
import { CourseAssignment } from './entities/course-assignment.entity';

@Controller('course-assignments')
export class CourseAssignmentsController {
  constructor(
    private readonly courseAssignmentsService: CourseAssignmentsService,
  ) {}

  @Post()
  async create(@Body() createCourseAssignmentDto: CreateCourseAssignmentDto) {
    return await this.courseAssignmentsService.create(
      createCourseAssignmentDto,
    );
  }

  @Get(':groupId/assignments')
  async findAll(
    @Param('groupId') groupId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginatedResponse<CourseAssignment>> {
    return this.courseAssignmentsService.findAll(groupId, page, limit);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.courseAssignmentsService.remove(id);
  }
}
