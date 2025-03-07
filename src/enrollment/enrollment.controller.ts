import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentResponse } from './interfaces/enrollment-response.interface';

interface RequestWithUser extends Request {
  user: {
    id: number;
    role: string;
  };
}

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  enrollStudent(
    @Body() enrollmentData: { studentId: number; courseId: number },
    @Req() request: RequestWithUser,
  ) {
    if (!request.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.enrollmentService.enrollStudent(
      enrollmentData.studentId,
      enrollmentData.courseId,
      request.user.id,
    );
  }

  @Post('courses/:courseId/students')
  async enrollMultipleStudents(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() data: { usernames: string[] },
    @Req() request: RequestWithUser,
  ) {
    if (!request.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.enrollmentService.enrollMultipleStudents(
      courseId,
      data.usernames,
      request.user.id,
    );
  }

  @Post('course/:courseId/scores')
  async updateCourseScores(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() data: { scores: { studentId: number; score: number }[] },
  ) {
    return this.enrollmentService.updateCourseScores(courseId, data.scores);
  }

  @Patch(':id/grade')
  submitGrade(
    @Param('id', ParseIntPipe) id: number,
    @Body() gradeData: { score: number },
  ) {
    return this.enrollmentService.submitGrade(id, gradeData.score);
  }

  @Post(':id/score')
  async submitScore(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { score: number },
  ) {
    if (data.score < 0 || data.score > 100) {
      throw new BadRequestException('Score must be between 0 and 100');
    }
    return this.enrollmentService.updateScore(id, data.score);
  }

  @Post('scores/bulk')
  async bulkUpdateScores(
    @Body() data: { scores: Array<{ enrollmentId: number; score: number }> },
  ) {
    return this.enrollmentService.bulkUpdateScores(data.scores);
  }

  @Get('student/:id/details')
  async getStudentEnrollmentDetails(
    @Param('id', ParseIntPipe) studentId: number,
  ) {
    return this.enrollmentService.getStudentEnrollmentDetails(studentId);
  }

  @Get('student/:id')
  getStudentEnrollments(
    @Param('id', ParseIntPipe) studentId: number,
  ): Promise<EnrollmentResponse[]> {
    return this.enrollmentService.getStudentEnrollments(studentId);
  }

  @Get('course/:id')
  getCourseEnrollments(
    @Param('id', ParseIntPipe) courseId: number,
  ): Promise<EnrollmentResponse[]> {
    return this.enrollmentService.getCourseEnrollments(courseId);
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
  async deleteEnrollment(@Param('id', ParseIntPipe) id: number) {
    return await this.enrollmentService.deleteEnrollment(id);
  }

  @Put(':id/score')
  async updateScore(
    @Param('id', ParseIntPipe) id: number,
    @Body('score', new ParseIntPipe()) score: number,
  ) {
    if (score < 0 || score > 100) {
      throw new BadRequestException('Score must be between 0 and 100');
    }
    return this.enrollmentService.updateScore(id, score);
  }
}
