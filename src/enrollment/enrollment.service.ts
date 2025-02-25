import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { Repository } from 'typeorm';
import { CourseGroup } from '../course-groups/entities/course-group.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollmentResponse } from './interfaces/enrollment-response.interface';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(CourseGroup)
    private courseGroupRepository: Repository<CourseGroup>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async enrollStudent(studentId: number, groupId: number, createdById: number) {
    if (!createdById) {
      throw new UnauthorizedException('User ID is required');
    }

    return await this.enrollmentRepository.manager.transaction(
      async (manager) => {
        const createdBy = await manager.findOne(User, {
          where: { id: createdById },
        });

        if (!createdBy) {
          throw new NotFoundException('کاربر ایجاد کننده یافت نشد');
        }

        const group = await manager.findOne(CourseGroup, {
          where: { id: groupId },
          relations: ['enrollments'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!group) {
          throw new NotFoundException('گروه درسی یافت نشد');
        }

        const student = await manager.findOne(User, {
          where: { id: studentId, role: UserRole.STUDENT },
        });

        if (!student) {
          throw new NotFoundException('دانشجو یافت نشد');
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

        const enrollment = new Enrollment();
        enrollment.student = student;
        enrollment.groupId = group.id;
        enrollment.group = group;
        enrollment.isActive = true;
        enrollment.createdById = createdById;
        enrollment.createdBy = createdBy;

        const savedEnrollment = await manager.save(Enrollment, enrollment);

        group.currentEnrollment++;
        await manager.save(group);

        return savedEnrollment;
      },
    );
  }

  async enrollMultipleStudents(
    groupId: number,
    usernames: string[],
    createdById: number,
  ) {
    return await this.enrollmentRepository.manager.transaction(
      async (manager) => {
        const group = await manager.findOne(CourseGroup, {
          where: { id: groupId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!group) {
          throw new NotFoundException('گروه درسی یافت نشد');
        }

        const createdBy = await manager.findOne(User, {
          where: { id: createdById },
        });
        if (!createdBy) {
          throw new NotFoundException('کاربر ایجاد کننده یافت نشد');
        }

        const results: {
          successful: Array<{ username: string; id: number }>;
          errors: Array<{ username: string; reason: string }>;
        } = {
          successful: [],
          errors: [],
        };

        for (const username of usernames) {
          try {
            const student = await manager.findOne(User, {
              where: {
                username,
                role: UserRole.STUDENT,
                isActive: true,
              },
            });

            if (!student) {
              results.errors.push({
                username,
                reason: 'دانشجو یافت نشد یا غیرفعال است',
              });
              continue;
            }

            const existingEnrollment = await manager.findOne(Enrollment, {
              where: {
                student: { id: student.id },
                group: { id: groupId },
                isActive: true,
              },
            });

            if (existingEnrollment) {
              results.errors.push({
                username,
                reason: 'دانشجو قبلاً در این گروه ثبت نام شده است',
              });
              continue;
            }

            const enrollment = manager.create(Enrollment, {
              student,
              group,
              isActive: true,
              createdById,
              createdBy,
            });

            await manager.save(enrollment);
            group.currentEnrollment++;
            results.successful.push({
              username: student.username,
              id: student.id,
            });
          } catch (error) {
            results.errors.push({
              username,
              reason: `خطا در ثبت نام: ${error.message}`,
            });
          }
        }

        await manager.save(group);
        return results;
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

    const enrollments = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const items: EnrollmentResponse[] = enrollments.map((enrollment) => ({
      id: enrollment.id,
      student: enrollment.student,
      group: enrollment.group,
      score: enrollment.score,
      createdAt: enrollment.createdAt,
      isActive: enrollment.isActive,
    }));

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
          throw new NotFoundException('ثبت نام مورد نظر یافت نشد');
        }

        const group = enrollment.group;
        if (!group) {
          throw new NotFoundException('گروه مورد نظر یافت نشد');
        }

        // Just mark as inactive, don't modify the relationship
        enrollment.isActive = false;
        await manager.save(enrollment);

        // Update group count
        if (group.currentEnrollment > 0) {
          group.currentEnrollment--;
          await manager.save(group);
        }
      },
    );
  }

  async create(createEnrollmentDto: CreateEnrollmentDto, createdById: number) {
    const { groupId } = createEnrollmentDto;

    // Check if the groupId exists in the course_group table
    const courseGroup = await this.courseGroupRepository.findOne({
      where: { id: groupId },
    });
    if (!courseGroup) {
      throw new NotFoundException(`Course group with ID ${groupId} not found`);
    }

    const createdBy = await this.userRepository.findOne({
      where: { id: createdById },
    });

    if (!createdBy) {
      throw new NotFoundException('کاربر ایجاد کننده یافت نشد');
    }

    const enrollment = this.enrollmentRepository.create({
      ...createEnrollmentDto,
      createdById,
      createdBy,
    });
    return await this.enrollmentRepository.save(enrollment);
  }

  async update(id: number, updateEnrollmentDto: UpdateEnrollmentDto) {
    const { groupId } = updateEnrollmentDto;

    // Check if the groupId exists in the course_group table
    if (groupId) {
      const courseGroup = await this.courseGroupRepository.findOne({
        where: { id: groupId },
      });
      if (!courseGroup) {
        throw new NotFoundException(
          `Course group with ID ${groupId} not found`,
        );
      }
    }

    const enrollment = await this.enrollmentRepository.preload({
      id,
      ...updateEnrollmentDto,
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    return await this.enrollmentRepository.save(enrollment);
  }

  async updateGroupScores(
    groupId: number,
    scores: Array<{ studentId: number; score: number }>,
  ) {
    return await this.enrollmentRepository.manager.transaction(
      async (manager) => {
        const results = {
          successful: [] as Array<{ studentId: number; score: number }>,
          errors: [] as Array<{ studentId: number; message: string }>,
        };

        for (const scoreData of scores) {
          try {
            if (scoreData.score < 0 || scoreData.score > 20) {
              throw new BadRequestException('نمره باید بین 0 تا 20 باشد');
            }

            const enrollment = await manager.findOne(Enrollment, {
              where: {
                student: { id: scoreData.studentId },
                groupId: groupId,
                isActive: true,
              },
            });

            if (!enrollment) {
              throw new NotFoundException('ثبت نام دانشجو یافت نشد');
            }

            enrollment.score = scoreData.score;
            await manager.save(enrollment);
            results.successful.push(scoreData);
          } catch (error) {
            results.errors.push({
              studentId: scoreData.studentId,
              message: error.message || 'خطا در ثبت نمره',
            });
          }
        }

        return results;
      },
    );
  }
}
