import { Controller, Post, Body, Get, Param, UseGuards, Patch } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  enrollStudent(
    @Body() enrollmentData: { studentId: number; groupId: number }
  ) {
    return this.enrollmentService.enrollStudent(
      enrollmentData.studentId,
      enrollmentData.groupId
    );
  }

  @Patch(':id/grade')
  submitGrade(
    @Param('id') id: string,
    @Body() gradeData: { score: number }
  ) {
    return this.enrollmentService.submitGrade(+id, gradeData.score);
  }

  @Get('student/:id')
  getStudentEnrollments(@Param('id') studentId: string) {
    return this.enrollmentService.getStudentEnrollments(+studentId);
  }

  @Get('group/:id')
  getGroupEnrollments(@Param('id') groupId: string) {
    return this.enrollmentService.getGroupEnrollments(+groupId);
  }
}
