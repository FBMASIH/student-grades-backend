import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateCourseGroupDto } from './dto/create-course-group.dto';
import { UpdateCourseGroupDto } from './dto/update-course-group.dto';
import { CourseGroup } from './entities/course-group.entity';

@Injectable()
export class CourseGroupsService {
  constructor(
    @InjectRepository(CourseGroup)
    private readonly courseGroupRepository: Repository<CourseGroup>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createCourseGroupDto: CreateCourseGroupDto) {
    try {
      const group = this.courseGroupRepository.create({
        groupNumber: createCourseGroupDto.groupNumber,
        capacity: createCourseGroupDto.capacity,
        currentEnrollment: 0,
        course: { id: createCourseGroupDto.courseId },
        professor: { id: createCourseGroupDto.professorId },
      });
      return await this.courseGroupRepository.save(group);
    } catch (error) {
      if (error.code === '23505') {
        // Unique violation error code for PostgreSQL
        throw new BadRequestException('شماره گروه باید یکتا باشد');
      }
      throw error;
    }
  }

  async enrollStudent(groupId: number, studentId: number) {
    const group = await this.courseGroupRepository.findOne({
      where: { id: groupId },
      relations: ['course'],
    });

    if (!group) {
      throw new NotFoundException('گروه درسی یافت نشد');
    }

    if (group.currentEnrollment >= group.capacity) {
      throw new BadRequestException('ظرفیت گروه تکمیل است');
    }

    group.currentEnrollment++;
    await this.courseGroupRepository.save(group);

    // Here you should create the enrollment record
    return group;
  }

  async addStudents(groupId: number, studentIds: number[]) {
    return await this.courseGroupRepository.manager.transaction(
      async (manager) => {
        const group = await manager.findOne(CourseGroup, {
          where: { id: groupId },
          relations: ['course', 'enrollments'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!group) {
          throw new NotFoundException('گروه درسی یافت نشد');
        }

        const remainingCapacity = group.capacity - group.currentEnrollment;
        if (studentIds.length > remainingCapacity) {
          throw new BadRequestException(
            `ظرفیت کافی برای ثبت نام ${studentIds.length} دانشجو وجود ندارد. ظرفیت باقیمانده: ${remainingCapacity}`,
          );
        }

        const results: {
          successful: number[];
          failed: { studentId: number; reason: string }[];
        } = {
          successful: [],
          failed: [],
        };

        for (const studentId of studentIds) {
          try {
            // Check if student is already enrolled in this course
            const existingEnrollment = await manager.findOne(Enrollment, {
              where: {
                student: { id: studentId },
                group: { course: { id: group.course.id } },
                isActive: true,
              },
              relations: ['group.course'],
            });

            if (existingEnrollment) {
              results.failed.push({
                studentId,
                reason: `دانشجو قبلا در درس ${group.course.name} ثبت نام کرده است`,
              });
              continue;
            }

            // Create new enrollment
            const enrollment = manager.create(Enrollment, {
              student: { id: studentId },
              group: { id: groupId },
            });
            await manager.save(enrollment);
            results.successful.push(studentId);
            group.currentEnrollment++;
          } catch (error) {
            results.failed.push({
              studentId,
              reason: 'خطا در ثبت نام',
            });
          }
        }

        // Save updated group capacity
        await manager.save(group);

        return {
          message: 'عملیات ثبت نام گروهی انجام شد',
          groupId,
          enrollmentResults: results,
        };
      },
    );
  }

  async getGroupStudents(groupId: number) {
    const group = await this.courseGroupRepository.findOne({
      where: { id: groupId },
      relations: ['enrollments', 'enrollments.student'],
    });

    if (!group) {
      throw new NotFoundException('گروه درسی یافت نشد');
    }

    return group.enrollments
      .filter((enrollment) => enrollment.isActive)
      .map((enrollment) => ({
        id: enrollment.student.id,
        username: enrollment.student.username,
        role: UserRole.STUDENT,
      }));
  }

  async getGroupStudentsStatus(groupId: number) {
    // Get the course group with its course and current enrollments
    const group = await this.courseGroupRepository.findOne({
      where: { id: groupId },
      relations: ['course', 'enrollments', 'enrollments.student'],
    });

    if (!group) {
      throw new NotFoundException('گروه درسی یافت نشد');
    }

    // Get enrolled student IDs
    const enrolledStudents = group.enrollments
      .filter((e) => e.isActive)
      .map((e) => e.student.id);

    // Get all students
    const allStudents = await this.userRepository.find({
      where: { role: UserRole.STUDENT },
      select: ['id', 'username'],
    });

    // Check for conflicts with other groups of the same course
    const conflictingStudentIds = await this.courseGroupRepository
      .createQueryBuilder('group')
      .innerJoin('group.enrollments', 'enrollment')
      .innerJoin('enrollment.student', 'student')
      .where('group.course.id = :courseId', { courseId: group.course.id })
      .andWhere('enrollment.isActive = :isActive', { isActive: true })
      .select('student.id', 'studentId')
      .getRawMany()
      .then((results) => results.map((r) => r.studentId));

    // Format available students with their enrollment status
    const availableStudents = allStudents.map((student) => ({
      id: student.id,
      username: student.username,
      isEnrolled: enrolledStudents.includes(student.id),
      canEnroll:
        !conflictingStudentIds.includes(student.id) &&
        group.currentEnrollment < group.capacity,
    }));

    return {
      enrolledStudents,
      availableStudents,
      groupCapacity: group.capacity,
      currentEnrollment: group.currentEnrollment,
      courseName: group.course.name,
    };
  }

  async findAvailableGroups(courseId: number) {
    return await this.courseGroupRepository.find({
      where: {
        course: { id: courseId },
      },
      relations: ['professor'],
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<PaginatedResponse<CourseGroup>> {
    const queryBuilder = this.courseGroupRepository
      .createQueryBuilder('courseGroup')
      .leftJoinAndSelect('courseGroup.course', 'course')
      .leftJoinAndSelect('courseGroup.professor', 'professor');

    if (search) {
      queryBuilder
        .where('course.name LIKE :search', { search: `%${search}%` })
        .orWhere('professor.name LIKE :search', { search: `%${search}%` });
    }

    const [items, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const courseGroup = await this.courseGroupRepository.findOne({
      where: { id },
      relations: ['course', 'professor'],
    });

    if (!courseGroup) {
      throw new NotFoundException('Course group not found');
    }

    return courseGroup;
  }

  async update(id: number, updateCourseGroupDto: UpdateCourseGroupDto) {
    const courseGroup = await this.findOne(id);

    Object.assign(courseGroup, {
      groupNumber: updateCourseGroupDto.groupNumber,
      capacity: updateCourseGroupDto.capacity,
      course: updateCourseGroupDto.courseId
        ? { id: updateCourseGroupDto.courseId }
        : courseGroup.course,
      professor: updateCourseGroupDto.professorId
        ? { id: updateCourseGroupDto.professorId }
        : courseGroup.professor,
    });

    try {
      return await this.courseGroupRepository.save(courseGroup);
    } catch (error) {
      if (error.code === '23505') {
        // Unique violation error code for PostgreSQL
        throw new BadRequestException('شماره گروه باید یکتا باشد');
      }
      throw error;
    }
  }

  async remove(id: number) {
    const courseGroup = await this.findOne(id);
    return await this.courseGroupRepository.remove(courseGroup);
  }
}
