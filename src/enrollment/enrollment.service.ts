import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { Repository } from 'typeorm';
import { CourseAssignment } from 'src/course-assignments/entities/course-assignment.entity';
import { Course } from '../course/entities/course.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollmentResponse } from './interfaces/enrollment-response.interface';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(CourseAssignment)
    private readonly courseAssignmentRepository: Repository<CourseAssignment>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async enrollStudent(
    studentId: number,
    courseId: number,
    createdById: number,
  ) {
    if (!createdById) {
      throw new UnauthorizedException('User ID is required');
    }

    return await this.enrollmentRepository.manager.transaction(
      async (manager) => {
        // Check if student is active
        const student = await manager.findOne(User, {
          where: { id: studentId, isActive: true, role: UserRole.STUDENT },
        });

        if (!student) {
          throw new NotFoundException('دانشجوی فعال یافت نشد');
        }

        // Check if creator is active
        const creator = await manager.findOne(User, {
          where: { id: createdById, isActive: true },
        });

        if (!creator) {
          throw new NotFoundException('کاربر ایجاد کننده یافت نشد');
        }

        const course = await manager.findOne(Course, {
          where: { id: courseId },
          relations: ['enrollments'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!course) {
          throw new NotFoundException('گروه درسی یافت نشد');
        }

        const existingEnrollment = await manager.findOne(Enrollment, {
          where: {
            student: { id: studentId },
            course: { id: courseId },
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
        enrollment.course = course;
        enrollment.isActive = true;
        enrollment.createdById = createdById;
        enrollment.createdBy = creator;

        const savedEnrollment = await manager.save(Enrollment, enrollment);

        return savedEnrollment;
      },
    );
  }

  async enrollMultipleStudents(
    courseId: number,
    usernames: string[],
    createdById: number,
  ) {
    return await this.enrollmentRepository.manager.transaction(
      async (manager) => {
        const course = await manager.findOne(Course, {
          where: { id: courseId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!course) {
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
                course: { id: courseId },
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
              course,
              isActive: true,
              createdById,
              createdBy,
            });

            await manager.save(enrollment);
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
      relations: ['student', 'course'],
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
        student: { id: studentId, isActive: true },
        isActive: true,
      },
      relations: ['course', 'course.professor'],
    });
  }

  async getCourseEnrollments(courseId: number) {
    return await this.enrollmentRepository.find({
      where: {
        course: { id: courseId },
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
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('course.professor', 'professor')
      .where('enrollment.isActive = :isActive', { isActive: true })
      .andWhere('student.isActive = :studentActive', { studentActive: true });

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
      course: enrollment.course,
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
          relations: ['course'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!enrollment) {
          throw new NotFoundException('ثبت نام مورد نظر یافت نشد');
        }

        // Just mark as inactive, don't modify the relationship
        enrollment.isActive = false;
        await manager.save(enrollment);
      },
    );
  }

  async create(createEnrollmentDto: CreateEnrollmentDto, createdById: number) {
    const { courseId } = createEnrollmentDto;

    // Check if the courseId exists in the course table
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
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
    const { courseId } = updateEnrollmentDto;

    // Check if the courseId exists in the course table
    if (courseId) {
      const course = await this.courseRepository.findOne({
        where: { id: courseId },
      });
      if (!course) {
        throw new NotFoundException(`Course with ID ${courseId} not found`);
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

  async updateCourseScores(
    courseId: number,
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
                courseId: courseId,
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

  async getStudentEnrollmentDetails(studentId: number) {
    const enrollments = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .where('enrollment.student.id = :studentId', { studentId })
      .andWhere('enrollment.isActive = :isActive', { isActive: true })
      .getMany();

    if (!enrollments.length) {
      throw new NotFoundException('Enrollments not found for the student');
    }

    return {
      enrollments: enrollments.map((enrollment) => ({
        id: enrollment.id,
        courseId: enrollment.course.id,
        courseName: enrollment.course.name,
        courseCode: enrollment.course.code,
        score: enrollment.score,
      })),
    };
  }

  async updateScore(enrollmentId: number, score: number) {
    if (score < 0 || score > 20) {
      throw new BadRequestException('Score must be between 0 and 20');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['student', 'course'],
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    enrollment.score = score;
    await this.enrollmentRepository.save(enrollment);
    return enrollment;
  }

  async bulkUpdateScores(
    scores: Array<{ enrollmentId: number; score: number }>,
  ) {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ enrollmentId: number; message: string }>,
    };

    for (const scoreData of scores) {
      try {
        if (scoreData.score < 0 || scoreData.score > 100) {
          throw new BadRequestException('Score must be between 0 and 100');
        }

        const enrollment = await this.enrollmentRepository.findOne({
          where: { id: scoreData.enrollmentId },
          relations: ['student', 'course'],
        });

        if (!enrollment) {
          throw new NotFoundException('Enrollment not found');
        }

        enrollment.score = scoreData.score;
        await this.enrollmentRepository.save(enrollment);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          enrollmentId: scoreData.enrollmentId,
          message: error.message || 'Error updating score',
        });
      }
    }

    return results;
  }

  async enrollStudents(assignmentId: number, studentIds: number[]) {
    const assignment = await this.courseAssignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['course', 'professor'],
    });

    if (!assignment) {
      throw new NotFoundException('Course assignment not found');
    }

    const results = {
      successful: [] as Array<{ id: number; username: string }>,
      errors: [] as Array<{ id: number; reason: string }>,
    };

    for (const studentId of studentIds) {
      try {
        const student = await this.userRepository.findOne({
          where: { id: studentId, role: UserRole.STUDENT },
        });

        if (!student) {
          results.errors.push({ id: studentId, reason: 'Student not found' });
          continue;
        }

        const existingEnrollment = await this.enrollmentRepository.findOne({
          where: {
            student: { id: studentId },
            courseId: assignment.courseId,
            isActive: true,
          },
        });

        if (existingEnrollment) {
          results.errors.push({
            id: studentId,
            reason: 'Student already enrolled',
          });
          continue;
        }

        const enrollment = this.enrollmentRepository.create({
          student,
          courseId: assignment.courseId,
          course: assignment.course,
          isActive: true,
          createdById: assignment.professorId,
          createdBy: assignment.professor,
        });

        await this.enrollmentRepository.save(enrollment);
        results.successful.push({ id: student.id, username: student.username });
      } catch (error) {
        results.errors.push({ id: studentId, reason: 'Enrollment failed' });
      }
    }

    return results;
  }

  async createEnrollmentForGroup(
    studentId: number,
    groupId: number,
    createdById: number,
  ) {
    // Find the group assignment
    const groupAssignment = await this.courseAssignmentRepository.findOne({
      where: { id: groupId },
      relations: ['course'],
    });
    if (!groupAssignment) {
      throw new NotFoundException('Group assignment not found');
    }
    // Find the student
    const student = await this.userRepository.findOne({
      where: { id: studentId, isActive: true, role: UserRole.STUDENT },
    });
    if (!student) {
      throw new NotFoundException('Student not found or inactive');
    }
    // Find the creator
    const creator = await this.userRepository.findOne({
      where: { id: createdById },
    });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }
    // Check for existing enrollment
    const existing = await this.enrollmentRepository.findOne({
      where: {
        student: { id: studentId },
        course: { id: groupAssignment.courseId },
        isActive: true,
      },
    });
    if (existing) {
      throw new BadRequestException('Student already enrolled in this group');
    }
    // Create enrollment
    const enrollment = new Enrollment();
    enrollment.student = student;
    enrollment.course = groupAssignment.course;
    enrollment.courseId = groupAssignment.courseId;
    enrollment.isActive = true;
    enrollment.createdById = createdById;
    enrollment.createdBy = creator;
    return this.enrollmentRepository.save(enrollment);
  }
}
