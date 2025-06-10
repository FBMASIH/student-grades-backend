import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { CourseAssignmentsService } from './course-assignments.service';
import { CreateCourseAssignmentDto } from './dto/create-course-assignment.dto';
import { CourseAssignment } from './entities/course-assignment.entity';
import { BulkCourseEnrollmentRequest } from './interfaces/student-response.interface';

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

  @Get(':id/students')
  async getAssignmentStudents(@Param('id', ParseIntPipe) id: number) {
    return this.courseAssignmentsService.getAssignmentStudents(id);
  }

  @Get(':id/available-students')
  async getAvailableStudents(
    @Param('id', ParseIntPipe) id: number,
    @Query('search') search?: string,
  ) {
    return this.courseAssignmentsService.getAvailableStudents(id, search);
  }

  @Get(':id/all-students')
  async getAllStudents(
    @Param('id', ParseIntPipe) id: number,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.courseAssignmentsService.getAllStudents(
      id,
      search,
      page,
      limit,
    );
  }

  @Post(':id/enroll')
  async enrollStudents(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { studentIds: number[] },
  ) {
    return this.courseAssignmentsService.enrollStudents(id, data.studentIds);
  }

  @Post(':id/unenroll')
  async unenrollStudents(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { studentIds: number[] },
  ) {
    return this.courseAssignmentsService.unenrollStudents(id, data.studentIds);
  }

  @Get(':id/search-students')
  async searchStudents(
    @Param('id', ParseIntPipe) id: number,
    @Query('query') query: string,
  ) {
    return this.courseAssignmentsService.searchStudents(id, query);
  }

  @Post(':id/bulk-enroll')
  async bulkEnroll(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { studentIds: number[] },
  ) {
    return this.courseAssignmentsService.bulkEnroll(id, data.studentIds);
  }

  @Post(':id/bulk-unenroll')
  async bulkUnenroll(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { studentIds: number[] },
  ) {
    return this.courseAssignmentsService.bulkUnenroll(id, data.studentIds);
  }

  @Post(':id/import-students')
  @UseInterceptors(FileInterceptor('file'))
  async importStudents(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.courseAssignmentsService.importStudents(id, file);
  }

  @Post('bulk-enroll-courses')
  async bulkEnrollCourses(@Body() data: BulkCourseEnrollmentRequest) {
    return this.courseAssignmentsService.bulkEnrollCourses(data);
  }
}
