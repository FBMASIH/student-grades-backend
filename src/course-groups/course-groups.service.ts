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
import { EnrollmentResult } from './interfaces/enrollment-result.interface';

@Injectable()
export class CourseGroupsService {
  constructor(
    @InjectRepository(CourseGroup)
    private readonly courseGroupRepository: Repository<CourseGroup>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async getNextGroupNumber(courseId: number): Promise<number> {
    const lastGroup = await this.courseGroupRepository.findOne({
      where: { course: { id: courseId } },
      order: { groupNumber: 'DESC' },
    });

    return lastGroup ? lastGroup.groupNumber + 1 : 1;
  }

  async create(createCourseGroupDto: CreateCourseGroupDto) {
    try {
      const nextGroupNumber = await this.getNextGroupNumber(
        createCourseGroupDto.courseId,
      );

      const group = this.courseGroupRepository.create({
        groupNumber: nextGroupNumber,
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

    group.currentEnrollment++;
    await this.courseGroupRepository.save(group);

    // Here you should create the enrollment record
    return group;
  }

  async addStudents(
    groupId: number,
    studentIds: number[],
    createdById: number, // Add this parameter
  ): Promise<EnrollmentResult> {
    return await this.courseGroupRepository.manager.transaction(
      async (manager) => {
        const group = await manager.findOne(CourseGroup, {
          where: { id: groupId },
          relations: ['course'],
        });

        if (!group) {
          throw new NotFoundException('گروه درسی یافت نشد');
        }

        // Verify creator exists
        const creator = await manager.findOne(User, {
          where: { id: createdById },
        });

        if (!creator) {
          throw new NotFoundException('کاربر ایجاد کننده یافت نشد');
        }

        const results = {
          successful: [] as number[],
          failed: [] as Array<{ studentId: number; reason: string }>,
        };

        for (const studentId of studentIds) {
          try {
            // Verify student exists and is a student
            const student = await manager.findOne(User, {
              where: { id: studentId, role: UserRole.STUDENT },
            });

            if (!student) {
              results.failed.push({
                studentId,
                reason: 'دانشجو یافت نشد',
              });
              continue;
            }

            // Check if student is already enrolled
            const existingEnrollment = await manager.findOne(Enrollment, {
              where: {
                student: { id: studentId },
                group: { id: groupId },
                isActive: true,
              },
            });

            if (existingEnrollment) {
              results.failed.push({
                studentId,
                reason: 'دانشجو قبلا در این گروه ثبت نام کرده است',
              });
              continue;
            }

            // Create enrollment with proper relations
            const enrollment = manager.create(Enrollment, {
              student: student, // Set the full student entity
              group: group, // Set the full group entity
              isActive: true,
              createdById: createdById, // Set the creator ID
              createdBy: creator, // Set the creator relation
            });

            await manager.save(Enrollment, enrollment);
            results.successful.push(studentId);
            group.currentEnrollment++;
          } catch (error) {
            console.error('Error details:', error);
            results.failed.push({
              studentId,
              reason: 'خطا در ثبت نام',
            });
          }
        }

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
    const group = await this.courseGroupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.enrollments', 'enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .where('group.id = :groupId', { groupId })
      .andWhere('enrollment.isActive = :isActive', { isActive: true })
      .getOne();

    if (!group) {
      throw new NotFoundException('گروه درسی یافت نشد');
    }

    return group.enrollments.map((enrollment) => ({
      id: enrollment.student.id,
      username: enrollment.student.username,
      role: UserRole.STUDENT,
      enrollmentId: enrollment.id, // Add this to track the enrollment
      groupId: group.id, // Add the group ID explicitly
    }));
  }

  async getGroupStudentsStatus(groupId: number) {
    // First, get the base group information without enrollments
    const group = await this.courseGroupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.course', 'course')
      .where('group.id = :groupId', { groupId })
      .getOne();

    if (!group) {
      throw new NotFoundException('گروه درسی یافت نشد');
    }

    // Get enrollments separately
    const enrollments = await this.courseGroupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.enrollments', 'enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .where('group.id = :groupId', { groupId })
      .andWhere('enrollment.isActive = :isActive', { isActive: true })
      .getOne();

    // Get all students with STUDENT role
    const allStudents = await this.userRepository.find({
      where: { role: UserRole.STUDENT },
      select: ['id', 'username'],
    });

    // Initialize empty Set for enrolled students
    const enrolledStudentIds = new Set(
      enrollments?.enrollments?.map((e) => e.student?.id) || [],
    );

    // Get students in other groups
    const studentsInOtherGroups = await this.courseGroupRepository
      .createQueryBuilder('group')
      .select('DISTINCT enrollment.studentId', 'studentId')
      .innerJoin('group.enrollments', 'enrollment')
      .where('group.courseId = :courseId', { courseId: group.courseId })
      .andWhere('group.id != :groupId', { groupId })
      .andWhere('enrollment.isActive = true')
      .getRawMany();

    const otherGroupStudentIds = new Set(
      studentsInOtherGroups?.map((s) => s.studentId) || [],
    );

    // Ensure currentEnrollment is a number
    group.currentEnrollment = group.currentEnrollment || 0;

    const students = allStudents.map((student) => ({
      id: student.id,
      username: student.username,
      isEnrolled: enrolledStudentIds.has(student.id),
      canEnroll:
        !enrolledStudentIds.has(student.id) &&
        !otherGroupStudentIds.has(student.id),
      enrollmentStatus: enrolledStudentIds.has(student.id)
        ? 'enrolled'
        : otherGroupStudentIds.has(student.id)
          ? 'enrolled_other_group'
          : 'not_enrolled',
    }));

    return {
      groupInfo: {
        id: group.id,
        groupNumber: group.groupNumber,
        currentEnrollment: group.currentEnrollment,
      },
      students,
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

  async getStudentsStatus(groupId: number) {
    const courseGroup = await this.findOne(groupId);
    if (!courseGroup) {
      throw new NotFoundException(`Course group with ID ${groupId} not found`);
    }

    // Implement logic to get students status
    // Example: return the list of students with their status
    return {
      groupId: courseGroup.id,
      students: courseGroup.enrollments.map((enrollment) => ({
        studentId: enrollment.student.id,
        status: enrollment.isActive ? 'active' : 'inactive',
      })),
    };
  }

  async update(id: number, updateCourseGroupDto: UpdateCourseGroupDto) {
    const courseGroup = await this.findOne(id);

    Object.assign(courseGroup, {
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

  async updateProfessor(groupId: number, professorId: number | null) {
    const group = await this.courseGroupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('گروه درسی یافت نشد');
    }

    group.professor = professorId ? ({ id: professorId } as User) : null;
    return await this.courseGroupRepository.save(group);
  }

  async removeProfessor(groupId: number) {
    return await this.updateProfessor(groupId, null);
  }

  async remove(id: number) {
    return await this.courseGroupRepository.manager.transaction(
      async (manager) => {
        const courseGroup = await manager.findOne(CourseGroup, {
          where: { id },
          relations: ['enrollments'],
        });

        if (!courseGroup) {
          throw new NotFoundException('گروه درسی یافت نشد');
        }

        // First, delete all enrollments
        await manager.delete('enrollments', { groupId: id });

        // Then delete the course group
        await manager.delete('course_groups', { id });

        return {
          message: 'گروه درسی و ثبت‌نام‌های مربوطه با موفقیت حذف شدند',
        };
      },
    );
  }
}
