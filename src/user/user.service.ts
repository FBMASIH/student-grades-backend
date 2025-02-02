import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // در این متد برای ثبت‌نام از endpoint ثبت‌نام، نقش به صورت پیش‌فرض STUDENT خواهد بود.
  async createUser(
    username: string,
    password: string,
    role: UserRole = UserRole.STUDENT,
  ): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { username } });
    if (existing) {
      throw new BadRequestException('کاربر با این نام کاربری وجود دارد');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      role,
    });
    return this.userRepository.save(user);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
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
      if (rowNumber === 1) return; // فرض بر این است که ردیف اول header است
      const usernameCell = row.getCell(1).value;
      const passwordCell = row.getCell(2).value;
      const roleCell = row.getCell(3).value;
      if (usernameCell && passwordCell && roleCell) {
        const roleStr = roleCell.toString().toLowerCase();
        // تنها اگر نقش به صورت صریح "teacher" یا "admin" باشد وارد می‌شود، در غیر این صورت STUDENT در نظر گرفته می‌شود.
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

  async findAll() {
    return this.userRepository.find({ select: ['id', 'username', 'role'] });
  }

  async updateUserRole(id: number, role: UserRole) {
    const user = await this.userRepository.findOne({ where: { id: id } });
    if (!user) throw new Error('کاربر پیدا نشد');
    user.role = role;
    await this.userRepository.save(user);
    return { message: 'نقش کاربر با موفقیت تغییر کرد' };
  }

  async deleteUser(id: string) {
    await this.userRepository.delete(id);
    return { message: 'کاربر حذف شد' };
  }
}
