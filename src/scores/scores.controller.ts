import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScoresService } from './scores.service';

@Controller('scores')
@UseGuards(JwtAuthGuard)
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Get('export')
  async exportScores(
    @Query('courseId') courseId?: number,
    @Query('studentId') studentId?: number,
  ) {
    return this.scoresService.exportScores(courseId, studentId);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importScores(@UploadedFile() file: Express.Multer.File) {
    return this.scoresService.importScores(file);
  }

  @Put(':id/score')
  async updateScore(@Param('id') id: number, @Body('score') score: number) {
    return this.scoresService.updateScore(id, score);
  }
}
