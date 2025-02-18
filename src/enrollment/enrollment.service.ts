import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { Repository } from 'typeorm';
import { CourseGroup } from '../course-groups/entities/course-group.entity';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollmentResponse } from './interfaces/enrollment-response.interface';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(CourseGroup)
    private courseGroupRepository: Repository<CourseGroup>,
  ) {}

  async enrollStudent(studentId: number, groupId: number) {
    return await this.enrollmentRepository.manager.transaction(
      async (manager) => {
        const group = await manager.findOne(CourseGroup, {
          where: { id: groupId },
          relations: ['enrollments'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!group) {
          throw new NotFoundException('گروه درسی یافت نشد');
        }

        if (group.currentEnrollment >= group.capacity) {
          throw new BadRequestException('ظرفیت گروه تکمیل است');
        }

        const existingEnrollment = await manager.findOne(Enrollment, {
          where: {
            student: { id: studentId },
            group: { id: groupId },
            isActive: true,
          },
        });

        if (existingEnrollment) {
          throw new BadRequestException(
            'دانشجو قبلا در این گروه ثبت نام کرده است',
          );
        }

        const enrollment = manager.create(Enrollment, {
          student: { id: studentId },
          group: { id: groupId },
        });

        await manager.save(enrollment);

        group.currentEnrollment++;
        await manager.save(group);

        return enrollment;
      },
    );
  }

  async submitGrade(enrollmentId: number, score: number) {
    if (score < 0 || score > 20) {
      throw new BadRequestException('نمره باید بین 0 تا 20 باشد');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['student', 'group'],
    });

    if (!enrollment) {
      throw new NotFoundException('ثبت نام یافت نشد');
    }

    enrollment.score = score;
    return await this.enrollmentRepository.save(enrollment);
  }

  async getStudentEnrollments(studentId: number) {
    return await this.enrollmentRepository.find({
      where: {
        student: { id: studentId },
        isActive: true,
      },
      relations: ['group', 'group.course', 'group.professor'],
    });
  }

  async getGroupEnrollments(groupId: number) {
    return await this.enrollmentRepository.find({
      where: {
        group: { id: groupId },
        isActive: true,
      },
      relations: ['student'],
    });
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
  ): Promise<PaginatedResponse<EnrollmentResponse>> {
    const queryBuilder = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.group', 'group')
      .leftJoinAndSelect('group.course', 'course')
      .leftJoinAndSelect('group.professor', 'professor')
      .where('enrollment.isActive = :isActive', { isActive: true });

    if (search) {
      queryBuilder.andWhere(
        '(student.firstName LIKE :search OR student.lastName LIKE :search OR course.name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    if (page > totalPages && total > 0) {
      throw new NotFoundException('Page not found');
    }

    const items = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async deleteEnrollment(id: number): Promise<void> {
    return await this.enrollmentRepository.manager.transaction(
      async (manager) => {
        const enrollment = await manager.findOne(Enrollment, {
          where: { id, isActive: true },
          relations: ['group'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!enrollment) {
          throw new NotFoundException('Enrollment not found');
        }

        const group = enrollment.group;
        group.currentEnrollment--;

        enrollment.isActive = false;

        await manager.save(group);
        await manager.save(enrollment);
      },
    );
  }
}
