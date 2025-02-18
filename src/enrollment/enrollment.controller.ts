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
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentResponse } from './interfaces/enrollment-response.interface';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  enrollStudent(
    @Body() enrollmentData: { studentId: number; groupId: number },
  ) {
    return this.enrollmentService.enrollStudent(
      enrollmentData.studentId,
      enrollmentData.groupId,
    );
  }

  @Patch(':id/grade')
  submitGrade(@Param('id') id: string, @Body() gradeData: { score: number }) {
    return this.enrollmentService.submitGrade(+id, gradeData.score);
  }

  @Get('student/:id')
  getStudentEnrollments(
    @Param('id') studentId: string,
  ): Promise<EnrollmentResponse[]> {
    return this.enrollmentService.getStudentEnrollments(+studentId);
  }

  @Get('group/:id')
  getGroupEnrollments(
    @Param('id') groupId: string,
  ): Promise<EnrollmentResponse[]> {
    return this.enrollmentService.getGroupEnrollments(+groupId);
  }

  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<EnrollmentResponse>> {
    try {
      return await this.enrollmentService.findAll(page, limit, search);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          items: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }
      throw error;
    }
  }

  @Delete(':id')
  async deleteEnrollment(@Param('id') id: string) {
    return await this.enrollmentService.deleteEnrollment(+id);
  }
}
