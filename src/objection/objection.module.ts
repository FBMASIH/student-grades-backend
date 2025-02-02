import { Module } from '@nestjs/common';
import { ObjectionController } from './objection.controller';
import { ObjectionService } from './objection.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Objection } from './entities/objection.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([Objection])],
  controllers: [ObjectionController],
  providers: [ObjectionService,JwtService],
})
export class ObjectionModule {}
