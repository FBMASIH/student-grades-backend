import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { buildPaginationMeta } from '../common/utils/pagination.util';
import { CourseAssignment } from '../course-assignments/entities/course-assignment.entity';
import { CourseGroup } from '../course-groups/entities/course-group.entity';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group } from './entities/group.entity';
import { Course } from '../course/entities/course.entity';
import { User, UserRole } from '../users/entities/user.entity';
import * as ExcelJS from 'exceljs';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(CourseAssignment)
    private readonly courseAssignmentRepository: Repository<CourseAssignment>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(CourseGroup)
    private readonly courseGroupRepository: Repository<CourseGroup>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async loadActiveStudentsFromUsers(groupId?: number) {
    const baseQuery = this.userRepository
      .createQueryBuilder('student')
      .where('student.role = :role', { role: UserRole.STUDENT })
      .andWhere('student.isActive = true')
      .orderBy('student.username', 'ASC');

    if (typeof groupId === 'number') {
      baseQuery.andWhere('student.groupId = :groupId', { groupId });
    }

    const students = await baseQuery.getMany();

    if (students.length > 0 || typeof groupId !== 'number') {
      return students;
    }

    return this.userRepository
      .createQueryBuilder('student')
      .where('student.role = :role', { role: UserRole.STUDENT })
      .andWhere('student.isActive = true')
      .orderBy('student.username', 'ASC')
      .getMany();
  }

  private mapUsersToGroupStudents(users: User[], course: Course | null) {
    return users.map((student) => ({
      id: student.id,
      username: student.username,
      firstName: student.firstName,
      lastName: student.lastName,
      isEnrolled: false,
      canEnroll: true,
      course,
      score: null,
    }));
  }

  async create(createGroupDto: CreateGroupDto): Promise<Group> {
    const group = this.groupRepository.create(createGroupDto);
    return this.groupRepository.save(group);
  }

  async update(id: number, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const group = await this.groupRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    group.name = updateGroupDto.name;
    return this.groupRepository.save(group);
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<PaginatedResponse<Group>> {
    const queryBuilder = this.groupRepository.createQueryBuilder('group');

    if (search) {
      queryBuilder.where('group.name LIKE :search', { search: `%${search}%` });
    }

    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    if (page > totalPages && total > 0) {
      throw new NotFoundException('Page not found');
    }

    const groups = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items: groups,
      meta: buildPaginationMeta(total, page, limit, groups.length),
    };
  }

  async findAssignments(
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

  async getStudentsByGroup(groupId: number) {
    const courseGroup = await this.courseGroupRepository.findOne({
      where: { id: groupId, isActive: true },
      relations: ['course'],
    });

    if (courseGroup) {
      let enrollments = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .leftJoinAndSelect('enrollment.student', 'student')
        .leftJoinAndSelect('enrollment.course', 'course')
        .where('enrollment.groupId = :groupId', { groupId })
        .andWhere('enrollment.isActive = true')
        .andWhere('student.isActive = true')
        .getMany();

      if (enrollments.length === 0) {
        enrollments = await this.enrollmentRepository
          .createQueryBuilder('enrollment')
          .leftJoinAndSelect('enrollment.student', 'student')
          .leftJoinAndSelect('enrollment.course', 'course')
          .where('enrollment.courseId = :courseId', {
            courseId: courseGroup.courseId,
          })
          .andWhere('enrollment.isActive = true')
          .andWhere('student.isActive = true')
          .andWhere('enrollment.groupId IS NULL')
          .getMany();
      }

      const mappedEnrollments = enrollments
        .filter((enrollment) => enrollment.student)
        .map((enrollment) => ({
          id: enrollment.student.id,
          username: enrollment.student.username,
          firstName: enrollment.student.firstName,
          lastName: enrollment.student.lastName,
          isEnrolled: true,
          canEnroll: true,
          course: enrollment.course,
          score: enrollment.score,
        }));

      const enrollmentCount = mappedEnrollments.length;
      let students = mappedEnrollments;

      if (students.length === 0) {
        const fallbackStudents =
          await this.loadActiveStudentsFromUsers(groupId);
        if (fallbackStudents.length > 0) {
          students = this.mapUsersToGroupStudents(
            fallbackStudents,
            courseGroup.course ?? null,
          );
        }
      }

      await this.courseGroupRepository.update(groupId, {
        currentEnrollment: enrollmentCount,
      });

      return {
        students,
        groupInfo: {
          id: courseGroup.id,
          groupNumber: courseGroup.groupNumber,
          courseName: courseGroup.course?.name ?? null,
          capacity:
            typeof courseGroup.capacity === 'number'
              ? courseGroup.capacity
              : null,
          currentEnrollment: enrollmentCount,
        },
      };
    }

    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const students = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.course', 'course')
      .innerJoin(
        'course_assignments',
        'ca',
        'ca.courseId = course.id AND ca.groupId = :groupId',
        { groupId },
      )
      .where('enrollment.isActive = true')
      .andWhere('student.isActive = true')
      .getMany();

    const mappedStudents = students.map((enrollment) => ({
      id: enrollment.student.id,
      username: enrollment.student.username,
      firstName: enrollment.student.firstName,
      lastName: enrollment.student.lastName,
      isEnrolled: true,
      canEnroll: true,
      course: enrollment.course,
      score: enrollment.score,
    }));

    const enrollmentCount = mappedStudents.length;
    let studentSummaries = mappedStudents;

    if (studentSummaries.length === 0) {
      const fallbackStudents = await this.loadActiveStudentsFromUsers(groupId);
      if (fallbackStudents.length > 0) {
        studentSummaries = this.mapUsersToGroupStudents(
          fallbackStudents,
          courseAssignment?.course ?? null,
        );
      }
    }

    const courseAssignment = await this.courseAssignmentRepository.findOne({
      where: { groupId },
      relations: ['course'],
    });

    const numericGroupNumber = Number(group.name);
    const groupNumber = Number.isFinite(numericGroupNumber)
      ? numericGroupNumber
      : null;

    return {
      students: studentSummaries,
      groupInfo: {
        id: groupId,
        groupNumber,
        courseName: courseAssignment?.course?.name ?? null,
        capacity:
          typeof courseAssignment?.capacity === 'number'
            ? courseAssignment.capacity
            : null,
        currentEnrollment: enrollmentCount,
      },
    };
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.groupRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Group not found');
    }
    return { message: 'Group deleted successfully' };
  }

  async submitGroupScores(
    groupId: number,
    scores: Array<{ studentId: number; score: number }>,
  ) {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ studentId: number; message: string }>,
    };

    // Verify the group exists
    const groupAssignment = await this.courseAssignmentRepository.findOne({
      where: { id: groupId },
    });
    if (!groupAssignment) {
      throw new NotFoundException('Group not found');
    }

    // Process each score in the array
    for (const scoreData of scores) {
      try {
        if (scoreData.score < 0 || scoreData.score > 20) {
          throw new Error('Score must be between 0 and 20');
        }

        const enrollment = await this.enrollmentRepository.findOne({
          where: {
            student: { id: scoreData.studentId },
            course: { id: groupAssignment.courseId },
            isActive: true,
          },
        });

        if (!enrollment) {
          results.failed++;
          results.errors.push({
            studentId: scoreData.studentId,
            message: 'Student enrollment not found',
          });
          continue;
        }

        enrollment.score = scoreData.score;
        await this.enrollmentRepository.save(enrollment);
        results.successful++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to update score';
        results.failed++;
        results.errors.push({
          studentId: scoreData.studentId,
          message,
        });
      }
    }

    return results;
  }

  async uploadScoresFromExcel(groupId: number, file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new BadRequestException('Worksheet not found');
    }

    const scores: Array<{ studentId: number; score: number }> = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const studentId = Number(row.getCell(1).value);
      const score = Number(row.getCell(2).value);
      if (!Number.isNaN(studentId) && !Number.isNaN(score)) {
        scores.push({ studentId, score });
      }
    });

    return this.submitGroupScores(groupId, scores);
  }
}
