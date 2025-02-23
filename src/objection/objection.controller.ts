import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
  @Patch('resolve/:id')
  resolveObjection(@Param('id') id: number) {
    return this.objectionService.resolveObjection(id);
  }
}
