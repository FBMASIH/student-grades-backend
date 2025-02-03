import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Patch,
  Delete,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { User, UserRole } from './entities/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { Request } from 'express';
import { UsersService } from './users.service';
import { Roles } from 'src/auth/role/roles.decorator';
import { RolesGuard } from 'src/auth/role/roles.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ثبت‌نام برای کاربران (همیشه نقش STUDENT)
  @Post('register')
  async register(
    @Body() body: { username: string; password: string },
  ): Promise<User> {
    return this.usersService.createUser(body.username, body.password);
  }

  // دریافت پروفایل کاربر (برای همه کاربران)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: Request) {
    return req['user'];
  }

  // مدیریت کاربران برای مدیر کل
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async getAllUsers() {
    return this.usersService.findAll();
  }

  // ایجاد کاربر به صورت دستی توسط مدیر کل (با انتخاب نقش)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('manual')
  async createUserManual(
    @Body()
    body: {
      username: string;
      password: string;
      role: UserRole;
    },
  ): Promise<User> {
    return this.usersService.createUser(
      body.username,
      body.password,
      body.role,
    );
  }

  // تغییر نقش کاربر توسط مدیر کل
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/role')
  async updateUserRole(@Param('id') id: number, @Body('role') role: UserRole) {
    return this.usersService.updateUserRole(id, role);
  }

  // حذف کاربر توسط مدیر کل
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async deleteUser(@Param('id') id: number) {
    return this.usersService.deleteUser(id);
  }

  // آپلود فایل اکسل برای وارد کردن کاربران توسط مدیر کل
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadUsers(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return this.usersService.importUsersFromExcel(file);
  }
}
