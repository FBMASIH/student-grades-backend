import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ObjectionService } from './objection.service';

@Controller('objections')
export class ObjectionController {
  constructor(private readonly objectionService: ObjectionService) {}

  @UseGuards(JwtAuthGuard)
  @Post('submit')
  submitObjection(
    @Body()
    objectionDto: {
      courseId: number;
      studentId: number;
      reason: string;
    },
  ) {
    return this.objectionService.submitObjection(objectionDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getObjections() {
    return this.objectionService.getObjections();
  }

  @UseGuards(JwtAuthGuard)
  @Get('teacher/:teacherId')
  getTeacherObjections(@Param('teacherId') teacherId: number) {
    return this.objectionService.getTeacherObjections(teacherId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/respond')
  respondToObjection(
    @Param('id') id: number,
    @Body() { response }: { response: string },
  ) {
    return this.objectionService.respondToObjection(id, response);
  }

  @UseGuards(JwtAuthGuard)
  @Get('students/:studentId') // Changed from 'students/:studentId/objections'
  async getStudentObjections(@Param('studentId') studentId: number) {
    return this.objectionService.getStudentObjections(studentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':objectionId/resolve')
  resolveObjection(
    @Param('objectionId') objectionId: number,
    @Body() data: { resolution: string },
  ) {
    return this.objectionService.resolveObjection(objectionId);
  }
}
