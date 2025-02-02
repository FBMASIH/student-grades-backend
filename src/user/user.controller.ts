import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { User, UserRole } from './entities/user.entity';
import { UserService } from './user.service';
import { Roles } from 'src/auth/role/roles.decorator';
import { RolesGuard } from 'src/auth/role/roles.guard';
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Controller('users')
  export class UserController {
    constructor(private readonly userService: UserService) {}

    @Roles('admin')
    @Get()
    async getAllUsers() {
      return this.userService.findAll();
    }

    @Get('me')
    async getProfile(@Req() req) {
      return req.user;
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Patch(':id/role')
    async updateUserRole(@Param('id') id: number, @Body('role') role: UserRole) {
      return this.userService.updateUserRole(id, role);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Delete(':id')
    async deleteUser(@Param('id') id: string) {
      return this.userService.deleteUser(id);
    }

    @Post('register')
    async register(
      @Body() body: { username: string; password: string },
    ): Promise<User> {
      // در ثبت‌نام، نقش به صورت پیش‌فرض STUDENT تنظیم می‌شود.
      return this.userService.createUser(body.username, body.password);
    }

    @Get(':username')
    async findByUsername(
      @Param('username') username: string,
    ): Promise<User | null> {
      return this.userService.findByUsername(username);
    }

    @Roles('admin')
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadUsers(
      @UploadedFile() file: Express.Multer.File,
      @Req() req: Request,
    ) {
      const user = req['user'] as JwtPayload;
      if (!user || user.role !== 'admin') {
        throw new ForbiddenException('دسترسی غیرمجاز');
      }
      return this.userService.importUsersFromExcel(file);
    }
  }
