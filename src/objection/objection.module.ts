import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { Objection } from './entities/objection.entity';
import { ObjectionController } from './objection.controller';
import { ObjectionService } from './objection.service';

@Module({
  imports: [TypeOrmModule.forFeature([Objection, User])],
  controllers: [ObjectionController],
  providers: [ObjectionService, JwtService, AuthService, UsersService],
})
export class ObjectionModule {}
