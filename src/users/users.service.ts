import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    role?: UserRole,
  ): Promise<PaginatedResponse<User>> {
    const skip = (page - 1) * limit;
    const query = this.usersRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.username', 'user.role'])
      .skip(skip)
      .take(limit);

    if (search) {
      query.andWhere('user.username LIKE :search', { search: `%${search}%` });
    }

    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    const [users, total] = await query.getManyAndCount();

    return {
      items: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // در این متد اگر role داده نشود، پیش‌فرض STUDENT است.
  async createUser(
    username: string,
    password: string,
    role: UserRole = UserRole.STUDENT,
  ): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { username },
    });
    if (existing) {
      throw new BadRequestException('کاربر با این نام کاربری وجود دارد');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      username,
      password: hashedPassword,
      role,
    });
    return this.usersRepository.save(user);
  }

  async updateUserRole(id: number, role: UserRole) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new BadRequestException('کاربر پیدا نشد');
    user.role = role as UserRole;
    await this.usersRepository.save(user);
    return { message: 'نقش کاربر با موفقیت تغییر کرد' };
  }

  async deleteUser(id: number) {
    await this.usersRepository.delete(id);
    return { message: 'کاربر حذف شد' };
  }
  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async importUsersFromExcel(
    file: Express.Multer.File,
  ): Promise<{ message: string }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new BadRequestException('فایل اکسل نامعتبر است یا حاوی داده نیست');
    }
    const usersToImport: {
      username: string;
      password: string;
      role: UserRole;
    }[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // ردیف اول header است
      const usernameCell = row.getCell(1).value;
      const passwordCell = row.getCell(2).value;
      const roleCell = row.getCell(3).value;
      if (usernameCell && passwordCell && roleCell) {
        const roleStr = roleCell.toString().toLowerCase();
        let role: UserRole;
        if (roleStr === UserRole.TEACHER) {
          role = UserRole.TEACHER;
        } else if (roleStr === UserRole.ADMIN) {
          role = UserRole.ADMIN;
        } else {
          role = UserRole.STUDENT;
        }
        usersToImport.push({
          username: usernameCell.toString(),
          password: passwordCell.toString(),
          role,
        });
      }
    });

    const errors: string[] = [];
    for (const userData of usersToImport) {
      try {
        await this.createUser(
          userData.username,
          userData.password,
          userData.role,
        );
      } catch (error: any) {
        errors.push(`ثبت کاربر ${userData.username}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      return { message: `برخی کاربران وارد نشدند: ${errors.join('; ')}` };
    }
    return { message: 'کاربران با موفقیت وارد شدند.' };
  }

  async updateUser(
    id: number,
    data: { username?: string; password?: string; role?: UserRole },
    currentUser: User,
  ) {
    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestException(
        'هیچ داده‌ای برای بروزرسانی ارائه نشده است',
      );
    }

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new BadRequestException('کاربر پیدا نشد');
    }

    // Only check for existing username if username is being updated and not null/empty
    if (data.username?.trim()) {
      const existingUser = await this.usersRepository.findOne({
        where: { username: data.username },
      });
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('این نام کاربری قبلاً استفاده شده است');
      }
      user.username = data.username;
    }

    // Only update password if it's provided and not empty
    if (data.password?.trim()) {
      user.password = await bcrypt.hash(data.password, 10);
    }

    // Only update role if it's provided and valid
    if (data.role && Object.values(UserRole).includes(data.role)) {
      if (currentUser.role !== UserRole.ADMIN) {
        throw new BadRequestException('فقط ادمین می‌تواند نقش را تغییر دهد');
      }
      user.role = data.role;
    }

    await this.usersRepository.save(user);
    return { message: 'اطلاعات کاربر با موفقیت بروزرسانی شد' };
  }
}
