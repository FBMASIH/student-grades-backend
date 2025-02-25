import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { User, UserRole } from './entities/user.entity';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';

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
      .select([
        'user.id',
        'user.username',
        'user.role',
        'user.firstName',
        'user.lastName',
      ])
      .where('user.isActive = :isActive', { isActive: true })
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
    firstName: string,
    lastName: string,
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
      firstName,
      lastName,
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
    return await this.usersRepository.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id },
        relations: ['enrollments', 'createdEnrollments'],
      });

      if (!user) {
        throw new NotFoundException('کاربر پیدا نشد');
      }

      // Delete all enrollments where the user is a student
      if (user.enrollments?.length > 0) {
        await manager.delete(Enrollment, { student: { id } });
      }

      // Delete all enrollments created by the user
      if (user.createdEnrollments?.length > 0) {
        await manager.delete(Enrollment, { createdBy: { id } });
      }

      // Finally, delete the user
      await manager.delete(User, { id });

      return { message: 'کاربر و تمام وابستگی‌های مربوطه با موفقیت حذف شدند' };
    });
  }

  async deleteMultipleUsers(ids: number[]): Promise<{
    successful: number[];
    errors: Array<{ id: number; message: string }>; // Define the type explicitly
  }> {
    const result = {
      successful: [] as number[],
      errors: [] as Array<{ id: number; message: string }>,
    };

    for (const id of ids) {
      try {
        await this.deleteUser(id);
        result.successful.push(id);
      } catch (error) {
        result.errors.push({
          id,
          message: error instanceof Error ? error.message : 'خطا در حذف کاربر',
        });
      }
    }

    return result;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        username,
        isActive: true,
      },
    });
  }

  async importUsersWithResponseFromExcel(file: Express.Multer.File): Promise<{
    users: User[];
    errors: string[];
    duplicates: Array<{
      username: string;
      firstName: string;
      lastName: string;
      message: string;
    }>;
    reactivated: Array<{
      username: string;
      firstName: string;
      lastName: string;
    }>;
  }> {
    const fileContent = file.buffer.toString();
    const lines = fileContent.split('\n');

    const result = {
      users: [] as User[],
      errors: [] as string[],
      duplicates: [] as Array<{
        username: string;
        firstName: string;
        lastName: string;
        message: string;
      }>,
      reactivated: [] as Array<{
        username: string;
        firstName: string;
        lastName: string;
      }>,
    };

    const usersToImport = lines
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line)
      .map((line) => {
        const [username, password, firstName, lastName] = line
          .split(',')
          .map((field) => field.trim());
        return { username, password, firstName, lastName };
      })
      .filter(({ username, password }) => username && password);

    for (const userData of usersToImport) {
      try {
        // Check for existing user (both active and inactive)
        const existingUser = await this.usersRepository.findOne({
          where: { username: userData.username },
        });

        if (existingUser) {
          if (!existingUser.isActive) {
            // Reactivate inactive user
            existingUser.isActive = true;
            existingUser.password = await bcrypt.hash(userData.password, 10);
            existingUser.firstName = userData.firstName;
            existingUser.lastName = userData.lastName;
            await this.usersRepository.save(existingUser);

            result.reactivated.push({
              username: existingUser.username,
              firstName: existingUser.firstName,
              lastName: existingUser.lastName,
            });
          } else {
            // Report active duplicate
            result.duplicates.push({
              username: existingUser.username,
              firstName: existingUser.firstName,
              lastName: existingUser.lastName,
              message: 'کاربر با این نام کاربری فعال است',
            });
          }
          continue;
        }

        // Create new user if doesn't exist
        const user = await this.createUser(
          userData.username,
          userData.password,
          userData.firstName,
          userData.lastName,
          UserRole.STUDENT,
        );
        result.users.push(user);
      } catch (error: any) {
        result.errors.push(`ثبت کاربر ${userData.username}: ${error.message}`);
      }
    }

    return result;
  }

  async updateUser(
    id: number,
    data: {
      username?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      role?: UserRole;
    },
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

    if (data.firstName?.trim()) {
      user.firstName = data.firstName;
    }
    if (data.lastName?.trim()) {
      user.lastName = data.lastName;
    }

    await this.usersRepository.save(user);
    return { message: 'اطلاعات کاربر با موفقیت بروزرسانی شد' };
  }

  async deleteAllStudents(): Promise<{
    successful: number[];
    errors: Array<{ id: number; message: string }>;
    total: number;
  }> {
    const students = await this.usersRepository.find({
      where: {
        role: UserRole.STUDENT,
        isActive: true,
      },
      relations: ['enrollments'],
    });

    console.log(`Found ${students.length} active students`);

    const result = {
      successful: [] as number[],
      errors: [] as Array<{ id: number; message: string }>,
      total: students.length,
    };

    await this.usersRepository.manager.transaction(async (manager) => {
      for (const student of students) {
        try {
          // Check active enrollments
          if (student.enrollments?.some((e) => e.isActive)) {
            throw new Error('این دانشجو دارای ثبت‌نام‌های فعال است');
          }

          student.isActive = false;
          await manager.save(student);
          result.successful.push(student.id);
        } catch (error) {
          result.errors.push({
            id: student.id,
            message:
              error instanceof Error ? error.message : 'خطا در حذف دانشجو',
          });
        }
      }
    });

    return result;
  }
}
