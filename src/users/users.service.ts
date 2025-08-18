import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { CourseGroup } from 'src/course-groups/entities/course-group.entity';
import { Brackets, Repository, DeepPartial } from 'typeorm';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(CourseGroup)
    private courseGroupRepository: Repository<CourseGroup>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    role?: UserRole,
    groupId?: number,
  ): Promise<PaginatedResponse<User & { groupName?: string }>> {
    const skip = (page - 1) * limit;

    const query = this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.enrollments', 'enrollment', 'enrollment.isActive = true')
      .leftJoin('course_assignments', 'ca', 'ca.courseId = enrollment.courseId')
      .leftJoin('groups', 'group', 'group.id = ca.groupId')
      .where('user.isActive = :isActive', { isActive: true });

    if (search) {
      query.andWhere('user.username LIKE :search', { search: `%${search}%` });
    }

    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    if (groupId) {
      query.andWhere('group.id = :groupId', { groupId });
    }

    const total = await query.getCount();

    const users = await query
      .select([
        'user.id AS id',
        'user.username AS username',
        'user.role AS role',
        'user.firstName AS firstName',
        'user.lastName AS lastName',
        'group.name AS groupName',
      ])
      .skip(skip)
      .take(limit)
      .getRawMany();

    return {
      items: users,
      meta: {
        total,
        totalItems: total,
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
    user.role = role;
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

      // Deactivate all enrollments where the user is a student
      if (user.enrollments?.length > 0) {
        await manager.update(
          Enrollment,
          { student: { id } },
          { isActive: false },
        );
      }

      // Deactivate all enrollments created by the user
      if (user.createdEnrollments?.length > 0) {
        await manager.update(
          Enrollment,
          { createdBy: { id } },
          { isActive: false },
        );
      }

      // Deactivate user instead of deleting
      user.isActive = false;
      await manager.save(user);

      return {
        message: 'کاربر و تمام وابستگی‌های مربوطه با موفقیت غیرفعال شدند',
      };
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

  async importUsersWithResponseFromExcel(
    file: Express.Multer.File,
    role: UserRole = UserRole.STUDENT,
    groupId?: number,
  ): Promise<{
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
    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException('نقش نامعتبر است');
    }

    // If a groupId is provided, validate and load the group for enrollment
    let group: CourseGroup | null = null;
    if (groupId) {
      group = await this.courseGroupRepository.findOne({
        where: { id: groupId },
        relations: ['course', 'professor'],
      });

      if (!group) {
        throw new BadRequestException('گروه یافت نشد');
      }
    }

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

    const ensureEnrollment = async (user: User) => {
      if (!group) return;

      const existingEnrollment = await this.enrollmentRepository.findOne({
        where: {
          student: { id: user.id },
          group: { id: group.id },
          isActive: true,
        },
      });

      if (!existingEnrollment) {
        const enrollment = this.enrollmentRepository.create({
          student: user,
          group,
          course: group.course,
          courseId: group.courseId,
          isActive: true,
          createdById: group.professorId,
          createdBy:
            group.professor ?? ({ id: group.professorId } as User),
        } as DeepPartial<Enrollment>);
        await this.enrollmentRepository.save(enrollment);
      }
    };

    for (const userData of usersToImport) {
      try {
        const existingUser = await this.usersRepository.findOne({
          where: { username: userData.username },
        });

        if (existingUser) {
          if (!existingUser.isActive) {
            existingUser.isActive = true;
            existingUser.password = await bcrypt.hash(userData.password, 10);
            existingUser.firstName = userData.firstName;
            existingUser.lastName = userData.lastName;
            existingUser.role = role;
            await this.usersRepository.save(existingUser);

            await ensureEnrollment(existingUser);

            result.reactivated.push({
              username: existingUser.username,
              firstName: existingUser.firstName,
              lastName: existingUser.lastName,
            });
          } else {
            result.duplicates.push({
              username: existingUser.username,
              firstName: existingUser.firstName,
              lastName: existingUser.lastName,
              message: 'کاربر با این نام کاربری فعال است',
            });
          }
          continue;
        }

        const user = await this.createUser(
          userData.username,
          userData.password,
          userData.firstName,
          userData.lastName,
          role,
        );

        await ensureEnrollment(user);

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
          // Deactivate all enrollments for this student
          await manager.update(
            Enrollment,
            { student: { id: student.id } },
            { isActive: false },
          );

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

  async searchStudents(query: string) {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.STUDENT })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere(
        new Brackets((qb) => {
          qb.where('user.username LIKE :query')
            .orWhere('user.firstName LIKE :query')
            .orWhere('user.lastName LIKE :query');
        }),
      )
      .setParameter('query', `%${query}%`)
      .select(['user.id', 'user.username', 'user.firstName', 'user.lastName'])
      .getMany();
  }
}
