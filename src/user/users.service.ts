import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll() {
    return this.usersRepository.find({ select: ['id', 'username', 'role'] });
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
}
