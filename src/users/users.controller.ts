import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { HasRoles } from 'src/auth/role/roles.decorator';
import { RolesGuard } from 'src/auth/role/roles.guard';
import { User, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';
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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: Request) {
    return req['user'];
  }

  @HasRoles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async getAllUsers(@Req() req: Request) {
    return this.usersService.findAll();
  }

  @HasRoles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @HasRoles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/role')
  async updateUserRole(@Param('id') id: number, @Body('role') role: UserRole) {
    return this.usersService.updateUserRole(id, role);
  }

  // حذف کاربر توسط مدیر کل
  @HasRoles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  async deleteUser(@Param('id') id: number) {
    return this.usersService.deleteUser(id);
  }

  // آپلود فایل اکسل برای وارد کردن کاربران توسط مدیر کل
  @HasRoles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadUsers(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return this.usersService.importUsersFromExcel(file);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateUser(
    @Param('id') id: number,
    @Body() updateData: { username?: string; password?: string; role?: UserRole },
    @Req() req: Request,
  ) {
    const currentUser = req.user as User;
    if (
      !currentUser ||
      (currentUser.role !== UserRole.ADMIN && currentUser.id !== id)
    ) {
      throw new BadRequestException(
        'شما مجاز به تغییر اطلاعات این کاربر نیستید',
      );
    }
    return this.usersService.updateUser(id, updateData, currentUser);
  }
}
