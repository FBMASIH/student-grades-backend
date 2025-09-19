import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseGroup } from 'src/course-groups/entities/course-group.entity';
import { Course } from 'src/course/entities/course.entity';
import { In, Repository } from 'typeorm';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { buildPaginationMeta } from '../common/utils/pagination.util';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CreateCourseAssignmentDto } from './dto/create-course-assignment.dto';
import { CourseAssignment } from './entities/course-assignment.entity';
import {
  BulkCourseEnrollmentRequest,
  BulkCourseEnrollmentResult,
  BulkEnrollmentResponse,
  ImportStudentsResponse,
  StudentResponse,
  StudentWithCourses,
} from './interfaces/student-response.interface';

@Injectable()
export class CourseAssignmentsService {
  constructor(
    @InjectRepository(CourseAssignment)
    private courseAssignmentRepository: Repository<CourseAssignment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    private usersService: UsersService, // Add this
  ) {}

  async create(
    createCourseAssignmentDto: CreateCourseAssignmentDto,
  ): Promise<CourseAssignment> {
    const courseAssignment = this.courseAssignmentRepository.create(
      createCourseAssignmentDto,
    );
    return this.courseAssignmentRepository.save(courseAssignment);
  }

  async findAll(
    groupId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<CourseAssignment>> {
    const [items, total] = await this.courseAssignmentRepository.findAndCount({
      where: { groupId },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      meta: buildPaginationMeta(total, page, limit, items.length),
    };
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.courseAssignmentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Course assignment not found');
    }
    return { message: 'Course assignment deleted successfully' };
  }

  async getAssignmentStudents(id: number) {
    const assignment = await this.courseAssignmentRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!assignment) {
      throw new NotFoundException('Course assignment not found');
    }

    const enrolledStudentsQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .where('enrollment.courseId = :courseId', {
        courseId: assignment.courseId,
      })
      .andWhere('enrollment.isActive = true')
      .andWhere('student.isActive = true');

    if (assignment.groupId) {
      enrolledStudentsQuery.andWhere('enrollment.groupId = :groupId', {
        groupId: assignment.groupId,
      });
    }

    const enrolledStudents = await enrolledStudentsQuery.getMany();

    const availableStudents = await this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.STUDENT })
      .andWhere('user.isActive = true')
      .andWhere(
        'user.id NOT IN (' +
          'SELECT DISTINCT student.id FROM enrollments enrollment ' +
          'INNER JOIN users student ON student.id = enrollment.studentId ' +
          'WHERE enrollment.courseId = :courseId AND enrollment.isActive = true)',
        { courseId: assignment.courseId },
      )
      .getMany();

    return {
      enrolled: enrolledStudents.map((e) => ({
        id: e.student.id,
        username: e.student.username,
        enrollmentId: e.id,
      })),
      available: availableStudents.map((s) => ({
        id: s.id,
        username: s.username,
      })),
    };
  }

  async getAvailableStudents(id: number, search?: string) {
    const assignment = await this.courseAssignmentRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!assignment) {
      throw new NotFoundException('Course assignment not found');
    }

    const enrollmentFilters = [
      'SELECT DISTINCT student.id FROM enrollments enrollment',
      'INNER JOIN users student ON student.id = enrollment.studentId',
      'WHERE enrollment.courseId = :courseId',
      'AND enrollment.isActive = true',
    ];

    const enrollmentParams: Record<string, unknown> = {
      courseId: assignment.courseId,
    };

    if (assignment.groupId) {
      enrollmentFilters.push('AND enrollment.groupId = :groupId');
      enrollmentParams.groupId = assignment.groupId;
    }

    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.STUDENT })
      .andWhere('user.isActive = true')
      .andWhere(
        `user.id NOT IN (${enrollmentFilters.join(' ')})`,
        enrollmentParams,
      );

    if (search) {
      query.andWhere('user.username LIKE :search', { search: `%${search}%` });
    }

    return await query.getMany();
  }

  async enrollStudents(id: number, studentIds: number[]) {
    return await this.courseAssignmentRepository.manager.transaction(
      async (manager) => {
        const assignment = await manager.findOne(CourseAssignment, {
          where: { id },
          relations: ['course', 'professor'],
        });

        if (!assignment) {
          throw new NotFoundException('Course assignment not found');
        }

        const courseGroup = assignment.groupId
          ? await manager.findOne(CourseGroup, {
              where: { id: assignment.groupId },
            })
          : null;

        if (assignment.groupId && !courseGroup) {
          throw new NotFoundException('Course group not found');
        }

        const results = {
          successful: [] as Array<{ id: number; username: string }>,
          errors: [] as Array<{ studentId: number; reason: string }>, // Changed id to studentId
        };

        for (const studentId of studentIds) {
          try {
            const student = await manager.findOne(User, {
              where: { id: studentId, role: UserRole.STUDENT, isActive: true },
            });

            if (!student) {
              results.errors.push({
                studentId, // Changed from id
                reason: 'Student not found or inactive',
              });
              continue;
            }

            const existingEnrollmentQuery = manager
              .createQueryBuilder(Enrollment, 'enrollment')
              .where('enrollment.studentId = :studentId', { studentId })
              .andWhere('enrollment.courseId = :courseId', {
                courseId: assignment.courseId,
              })
              .andWhere('enrollment.isActive = true');

            if (courseGroup) {
              existingEnrollmentQuery.andWhere(
                'enrollment.groupId = :groupId',
                {
                  groupId: courseGroup.id,
                },
              );
            } else {
              existingEnrollmentQuery.andWhere('enrollment.groupId IS NULL');
            }

            const existingEnrollment = await existingEnrollmentQuery.getOne();

            if (!existingEnrollment && courseGroup) {
              const legacyEnrollment = await manager
                .createQueryBuilder(Enrollment, 'legacyEnrollment')
                .leftJoinAndSelect('legacyEnrollment.student', 'legacyStudent')
                .where('legacyEnrollment.studentId = :studentId', {
                  studentId,
                })
                .andWhere('legacyEnrollment.courseId = :courseId', {
                  courseId: assignment.courseId,
                })
                .andWhere('legacyEnrollment.isActive = true')
                .andWhere('legacyEnrollment.groupId IS NULL')
                .getOne();

              if (legacyEnrollment) {
                legacyEnrollment.group = courseGroup;
                legacyEnrollment.groupId = courseGroup.id;
                await manager.save(legacyEnrollment);
                results.successful.push({
                  id: legacyEnrollment.student.id,
                  username: legacyEnrollment.student.username,
                });
                continue;
              }
            }

            if (existingEnrollment) {
              results.errors.push({
                studentId,
                reason: 'Student already enrolled',
              });
              continue;
            }

            const enrollment = manager.create(Enrollment, {
              student,
              courseId: assignment.courseId,
              course: assignment.course,
              group: courseGroup,
              groupId: courseGroup?.id ?? null,
              isActive: true,
              createdById: assignment.professorId,
              createdBy: assignment.professor,
            });

            await manager.save(enrollment);
            results.successful.push({
              id: student.id,
              username: student.username,
            });
          } catch (error) {
            results.errors.push({
              studentId, // Changed from id
              reason: 'Failed to enroll student',
            });
          }
        }

        return results;
      },
    );
  }

  async unenrollStudents(id: number, studentIds: number[]) {
    return await this.courseAssignmentRepository.manager.transaction(
      async (manager) => {
        const assignment = await manager.findOne(CourseAssignment, {
          where: { id },
          relations: ['course'],
        });

        if (!assignment) {
          throw new NotFoundException('Course assignment not found');
        }

        const courseGroup = assignment.groupId
          ? await manager.findOne(CourseGroup, {
              where: { id: assignment.groupId },
            })
          : null;

        if (assignment.groupId && !courseGroup) {
          throw new NotFoundException('Course group not found');
        }

        const results = {
          successful: [] as number[],
          errors: [] as Array<{ studentId: number; reason: string }>, // Changed id to studentId
        };

        for (const studentId of studentIds) {
          try {
            const enrollmentQuery = manager
              .createQueryBuilder(Enrollment, 'enrollment')
              .where('enrollment.studentId = :studentId', { studentId })
              .andWhere('enrollment.courseId = :courseId', {
                courseId: assignment.courseId,
              })
              .andWhere('enrollment.isActive = true');

            if (courseGroup) {
              enrollmentQuery.andWhere('enrollment.groupId = :groupId', {
                groupId: courseGroup.id,
              });
            } else {
              enrollmentQuery.andWhere('enrollment.groupId IS NULL');
            }

            let enrollment = await enrollmentQuery.getOne();

            if (!enrollment && courseGroup) {
              const legacyEnrollment = await manager
                .createQueryBuilder(Enrollment, 'legacyEnrollment')
                .where('legacyEnrollment.studentId = :studentId', {
                  studentId,
                })
                .andWhere('legacyEnrollment.courseId = :courseId', {
                  courseId: assignment.courseId,
                })
                .andWhere('legacyEnrollment.isActive = true')
                .andWhere('legacyEnrollment.groupId IS NULL')
                .getOne();

              if (legacyEnrollment) {
                legacyEnrollment.group = courseGroup;
                legacyEnrollment.groupId = courseGroup.id;
                enrollment = legacyEnrollment;
              }
            }

            if (!enrollment) {
              results.errors.push({
                studentId, // Changed from id
                reason: 'Enrollment not found',
              });
              continue;
            }

            enrollment.isActive = false;
            await manager.save(enrollment);
            results.successful.push(studentId);
          } catch (error) {
            results.errors.push({
              studentId, // Changed from id
              reason: 'Failed to unenroll student',
            });
          }
        }

        return results;
      },
    );
  }

  async getAllStudents(
    id: number,
    search?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const assignment = await this.validateAssignment(id);

    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.STUDENT })
      .andWhere('user.isActive = true');

    if (search) {
      query.andWhere(
        '(user.username LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [students, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Enhanced enrollment query with proper joins
    const enrollmentQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.group', 'group')
      .where('student.id IN (:...studentIds)', {
        studentIds: students.map((s) => s.id),
      })
      .andWhere('enrollment.isActive = true')
      .andWhere('enrollment.courseId = :courseId', {
        courseId: assignment.courseId,
      });

    if (assignment.groupId) {
      enrollmentQuery.andWhere('enrollment.groupId = :groupId', {
        groupId: assignment.groupId,
      });
    }

    const enrollments = await enrollmentQuery.getMany();

    // Group enrollments by student id for easier lookup
    const studentEnrollments = new Map();
    enrollments.forEach((enrollment) => {
      if (enrollment.student?.id) {
        if (!studentEnrollments.has(enrollment.student.id)) {
          studentEnrollments.set(enrollment.student.id, []);
        }
        studentEnrollments.get(enrollment.student.id).push(enrollment);
      }
    });

    const studentsWithCourses: StudentWithCourses[] = students.map(
      (student) => {
        const studentEnrolls = studentEnrollments.get(student.id) || [];
        return {
          id: student.id,
          username: student.username,
          firstName: student.firstName,
          lastName: student.lastName,
          isEnrolled: studentEnrolls.length > 0,
          enrollmentId: studentEnrolls[0]?.id, // Get first enrollment id if exists
          enrolledCourses: studentEnrolls
            .filter((e) => e.course && e.group) // Ensure course and group exist
            .map((e) => ({
              id: e.course.id,
              name: e.course.name,
              groupId: e.group.id,
            })),
        };
      },
    );

    return {
      students: studentsWithCourses,
      total,
    };
  }

  async searchStudents(
    id: number,
    query: string,
  ): Promise<{ students: StudentResponse[] }> {
    const assignment = await this.validateAssignment(id);

    const students = await this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.STUDENT })
      .andWhere('user.isActive = true')
      .andWhere(
        '(user.username LIKE :query OR user.firstName LIKE :query OR user.lastName LIKE :query)',
        { query: `%${query}%` },
      )
      .getMany();

    const enrollments = await this.getEnrollments(
      assignment.courseId,
      assignment.groupId ?? null,
    );
    const enrollmentMap = new Map(enrollments.map((e) => [e.student.id, e]));

    return {
      students: students.map((student) => ({
        id: student.id,
        username: student.username,
        firstName: student.firstName,
        lastName: student.lastName,
        isEnrolled: enrollmentMap.has(student.id),
        enrollmentId: enrollmentMap.get(student.id)?.id,
      })),
    };
  }

  async bulkEnroll(
    id: number,
    studentIds: number[],
  ): Promise<BulkEnrollmentResponse> {
    const result = await this.enrollStudents(id, studentIds);
    return {
      success: result.errors.length === 0,
      enrolled: result.successful.length,
      errors: result.errors, // Now matches the interface type
    };
  }

  async bulkUnenroll(
    id: number,
    studentIds: number[],
  ): Promise<BulkEnrollmentResponse> {
    const result = await this.unenrollStudents(id, studentIds);
    return {
      success: result.errors.length === 0,
      unenrolled: result.successful.length, // Now matches interface
      errors: result.errors,
    };
  }

  async importStudents(
    id: number,
    file: Express.Multer.File,
  ): Promise<ImportStudentsResponse> {
    const assignment = await this.validateAssignment(id);

    return await this.courseAssignmentRepository.manager.transaction(
      async (manager) => {
        const courseGroup = assignment.groupId
          ? await manager.findOne(CourseGroup, {
              where: { id: assignment.groupId },
            })
          : null;

        if (assignment.groupId && !courseGroup) {
          throw new NotFoundException('Course group not found');
        }

        const importResult =
          await this.usersService.importUsersWithResponseFromExcel(file);

        const results: ImportStudentsResponse = {
          success: true,
          imported: 0,
          errors: [],
          students: [],
        };

        // Process each successfully imported user
        for (const user of importResult.users) {
          try {
            // Create enrollment for the imported student
            const enrollment = manager.create(Enrollment, {
              student: user,
              courseId: assignment.courseId,
              course: assignment.course,
              group: courseGroup,
              groupId: courseGroup?.id ?? null,
              isActive: true,
              createdById: assignment.professorId,
              createdBy: assignment.professor,
            });

            await manager.save(enrollment);

            results.students.push({
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
            });

            results.imported++;
          } catch (error) {
            results.errors.push({
              row: results.imported + 2, // +2 because Excel rows start at 1 and we skip header
              reason: `Failed to enroll student: ${error.message}`,
            });
          }
        }

        // Add any import errors
        results.errors.push(
          ...importResult.errors.map((error, index) => ({
            row: index + 2,
            reason: error,
          })),
        );

        results.success = results.imported > 0 && results.errors.length === 0;
        return results;
      },
    );
  }

  async bulkEnrollCourses(
    data: BulkCourseEnrollmentRequest,
  ): Promise<BulkCourseEnrollmentResult> {
    return await this.courseAssignmentRepository.manager.transaction(
      async (manager) => {
        const results: BulkCourseEnrollmentResult = {
          success: true,
          enrollments: [],
        };

        // Validate group
        const group = await manager.findOne(CourseGroup, {
          where: { id: data.groupId },
        });

        if (!group) {
          throw new NotFoundException('Group not found');
        }

        // Get all courses at once
        const courses = await manager.find(Course, {
          where: { id: In(data.courseIds) },
        });

        // Get existing enrollments
        const existingEnrollments = await manager.find(Enrollment, {
          where: {
            student: { id: In(data.studentIds) },
            course: { id: In(data.courseIds) },
            group: { id: data.groupId },
            isActive: true,
          },
          relations: ['group', 'course', 'student'],
        });

        // Process each student-course combination
        for (const studentId of data.studentIds) {
          for (const courseId of data.courseIds) {
            try {
              // Check existing enrollment
              const hasEnrollment = existingEnrollments.some(
                (e) =>
                  e.student.id === studentId &&
                  e.course.id === courseId &&
                  e.group?.id === data.groupId,
              );

              if (hasEnrollment) {
                results.enrollments.push({
                  studentId,
                  courseId,
                  success: false,
                  reason: 'Already enrolled',
                });
                continue;
              }

              const legacyEnrollment = await manager
                .createQueryBuilder(Enrollment, 'legacyEnrollment')
                .where('legacyEnrollment.studentId = :studentId', {
                  studentId,
                })
                .andWhere('legacyEnrollment.courseId = :courseId', {
                  courseId,
                })
                .andWhere('legacyEnrollment.isActive = true')
                .andWhere('legacyEnrollment.groupId IS NULL')
                .getOne();

              if (legacyEnrollment) {
                legacyEnrollment.group = { id: data.groupId } as CourseGroup;
                legacyEnrollment.groupId = data.groupId;
                await manager.save(legacyEnrollment);

                results.enrollments.push({
                  studentId,
                  courseId,
                  success: true,
                });
                continue;
              }

              // Create enrollment
              const enrollment = manager.create(Enrollment, {
                student: { id: studentId },
                course: { id: courseId },
                courseId,
                group: { id: data.groupId },
                groupId: data.groupId,
                isActive: true,
              });

              await manager.save(enrollment);

              results.enrollments.push({
                studentId,
                courseId,
                success: true,
              });
            } catch (error) {
              results.enrollments.push({
                studentId,
                courseId,
                success: false,
                reason: error.message,
              });
            }
          }
        }

        results.success = results.enrollments.every((e) => e.success);
        return results;
      },
    );
  }

  private async validateAssignment(id: number): Promise<CourseAssignment> {
    const assignment = await this.courseAssignmentRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!assignment) {
      throw new NotFoundException('Course assignment not found');
    }

    return assignment;
  }

  private async getEnrollments(
    courseId: number,
    groupId: number | null,
  ): Promise<Enrollment[]> {
    const query = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .where('enrollment.courseId = :courseId', { courseId })
      .andWhere('enrollment.isActive = true');

    if (groupId) {
      query.andWhere('enrollment.groupId = :groupId', { groupId });
    } else {
      query.andWhere('enrollment.groupId IS NULL');
    }

    return query.getMany();
  }
}
