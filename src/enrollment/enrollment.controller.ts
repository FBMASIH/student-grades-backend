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
    @Body() enrollmentData: { studentId: number; groupId: number },
    @Req() request: RequestWithUser,
  ) {
    if (!request.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.enrollmentService.enrollStudent(
      enrollmentData.studentId,
      enrollmentData.groupId,
      request.user.id,
    );
  }

  @Post('groups/:groupId/students')
  @UseGuards(JwtAuthGuard)
  async enrollMultipleStudents(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() data: { usernames: string[] },
    @Req() request: RequestWithUser,
  ) {
    if (!request.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.enrollmentService.enrollMultipleStudents(
      groupId,
      data.usernames,
      request.user.id,
    );
  }

  @Post('group/:groupId/scores')
  async updateGroupScores(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() data: { scores: { studentId: number; score: number }[] },
  ) {
    return this.enrollmentService.updateGroupScores(groupId, data.scores);
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
