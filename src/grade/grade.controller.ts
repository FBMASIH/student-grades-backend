import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GradeService } from './grade.service';

@Controller('grades')
export class GradeController {
  constructor(private readonly gradesService: GradeService) {}

  @UseGuards(JwtAuthGuard)
  @Get('student/:id')
  getStudentGrades(@Param('id') studentId: number) {
    return this.gradesService.getStudentGrades(studentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('assign')
  assignGrade(
    @Body()
    assignGradeDto: {
      studentId: number;
      subject: string;
      score: number;
    },
  ) {
    return this.gradesService.assignGrade(assignGradeDto);
  }
}
