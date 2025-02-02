import { Module } from '@nestjs/common';
import { Grade } from './entities/grade.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { GradeController } from './grade.controller';
import { GradeService } from './grade.service';

@Module({
  imports: [TypeOrmModule.forFeature([Grade])],
  controllers: [GradeController],
  providers: [GradeService,JwtService],
})
export class GradeModule {}
