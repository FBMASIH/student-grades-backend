import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { buildPaginationMeta } from '../common/utils/pagination.util';
import { Course } from '../course/entities/course.entity';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateCourseGroupDto } from './dto/create-course-group.dto';
import { UpdateCourseGroupDto } from './dto/update-course-group.dto';
import { CourseGroup } from './entities/course-group.entity';
import {
  GroupResponse,
  GroupStudentSummary,
  GroupStudentsResponse,
} from './interfaces/group-response.interface';

interface EnrollmentState {
  activeStudentIds: Set<number>;
  otherGroupStudentIds: Set<number>;
  currentEnrollment: number;
}

@Injectable()
export class CourseGroupsService {
  constructor(
    @InjectRepository(CourseGroup)
    private readonly courseGroupRepository: Repository<CourseGroup>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  private async getNextGroupNumber(courseId: number): Promise<number> {
    const lastGroup = await this.courseGroupRepository.findOne({
      where: { course: { id: courseId } },
      order: { groupNumber: 'DESC' },
    });

    return lastGroup ? lastGroup.groupNumber + 1 : 1;
  }

  private mapToGroupResponse(
    group: CourseGroup,
    currentEnrollment?: number,
  ): GroupResponse {
    const enrollmentCount =
      typeof currentEnrollment === 'number'
        ? currentEnrollment
        : (group.currentEnrollment ?? 0);

    return {
      id: group.id,
      groupNumber: group.groupNumber,
      currentEnrollment: enrollmentCount,
      capacity: typeof group.capacity === 'number' ? group.capacity : null,
      course: group.course
        ? { id: group.course.id, name: group.course.name }
        : null,
      professor: group.professor
        ? {
            id: group.professor.id,
            username: group.professor.username,
            firstName: group.professor.firstName,
            lastName: group.professor.lastName,
            role: group.professor.role,
          }
        : null,
    };
  }

  private buildGroupInfo(
    group: CourseGroup,
    currentEnrollment: number,
  ): GroupStudentsResponse['groupInfo'] {
    return {
      id: group.id,
      groupNumber: group.groupNumber,
      courseName: group.course?.name ?? null,
      capacity: typeof group.capacity === 'number' ? group.capacity : null,
      currentEnrollment,
    };
  }

  private async getGroupOrFail(
    id: number,
    manager?: EntityManager,
  ): Promise<CourseGroup> {
    const repository = manager
      ? manager.getRepository(CourseGroup)
      : this.courseGroupRepository;

    const group = await repository.findOne({
      where: { id },
      relations: ['course', 'professor'],
    });

    if (!group) {
      throw new NotFoundException('گروه درسی یافت نشد');
    }

    return group;
  }

  private async getActiveStudentIds(
    manager: EntityManager,
    groupId: number,
  ): Promise<Set<number>> {
    const rows = await manager
      .createQueryBuilder(Enrollment, 'enrollment')
      .select('enrollment.studentId', 'studentId')
      .where('enrollment.groupId = :groupId', { groupId })
      .andWhere('enrollment.isActive = true')
      .getRawMany();

    return new Set(rows.map((row) => Number(row.studentId)));
  }

  private async getOtherGroupStudentIds(
    manager: EntityManager,
    courseId: number,
    groupId: number,
  ): Promise<Set<number>> {
    const rows = await manager
      .createQueryBuilder(Enrollment, 'enrollment')
      .innerJoin('enrollment.group', 'group')
      .select('DISTINCT enrollment.studentId', 'studentId')
      .where('group.courseId = :courseId', { courseId })
      .andWhere('group.id != :groupId', { groupId })
      .andWhere('enrollment.isActive = true')
      .getRawMany();

    return new Set(rows.map((row) => Number(row.studentId)));
  }

  private async ensureCreator(
    manager: EntityManager,
    createdById: number,
  ): Promise<User> {
    const creator = await manager.findOne(User, {
      where: { id: createdById },
    });

    if (!creator) {
      throw new NotFoundException('کاربر ایجاد کننده یافت نشد');
    }

    return creator;
  }

  private async attemptEnrollStudent(
    manager: EntityManager,
    group: CourseGroup,
    creator: User,
    student: User,
    state: EnrollmentState,
  ): Promise<string | null> {
    if (student.role !== UserRole.STUDENT || !student.isActive) {
      return 'دانشجو یافت نشد یا فعال نیست';
    }

    if (state.activeStudentIds.has(student.id)) {
      return 'دانشجو قبلا در این گروه ثبت نام کرده است';
    }

    if (
      typeof group.capacity === 'number' &&
      group.capacity > 0 &&
      state.currentEnrollment >= group.capacity
    ) {
      return 'ظرفیت گروه تکمیل است';
    }

    if (state.otherGroupStudentIds.has(student.id)) {
      return 'دانشجو در گروه دیگری از این درس ثبت‌نام دارد';
    }

    const enrollment = manager.create(Enrollment, {
      student,
      group,
      courseId: group.courseId,
      course: group.course ?? ({ id: group.courseId } as Course),
      isActive: true,
      createdById: creator.id,
      createdBy: creator,
    });

    await manager.save(enrollment);

    state.activeStudentIds.add(student.id);
    state.currentEnrollment += 1;

    return null;
  }

  async create(
    createCourseGroupDto: CreateCourseGroupDto,
  ): Promise<GroupResponse> {
    const course = await this.courseRepository.findOne({
      where: { id: createCourseGroupDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('درس یافت نشد');
    }

    const professor = await this.userRepository.findOne({
      where: { id: createCourseGroupDto.professorId },
    });

    if (!professor) {
      throw new NotFoundException('استاد یافت نشد');
    }

    const nextGroupNumber = await this.getNextGroupNumber(course.id);

    const group = this.courseGroupRepository.create({
      groupNumber: nextGroupNumber,
      currentEnrollment: 0,
      capacity:
        typeof createCourseGroupDto.capacity === 'number'
          ? createCourseGroupDto.capacity
          : null,
      course,
      courseId: course.id,
      professor,
      professorId: professor.id,
    });

    try {
      const saved = await this.courseGroupRepository.save(group);
      const reloaded = await this.courseGroupRepository.findOne({
        where: { id: saved.id },
        relations: ['course', 'professor'],
      });
      return this.mapToGroupResponse(reloaded ?? saved, 0);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new BadRequestException('شماره گروه باید یکتا باشد');
      }
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<PaginatedResponse<GroupResponse>> {
    const queryBuilder = this.courseGroupRepository
      .createQueryBuilder('courseGroup')
      .leftJoinAndSelect('courseGroup.course', 'course')
      .leftJoinAndSelect('courseGroup.professor', 'professor')
      .orderBy('courseGroup.groupNumber', 'ASC');

    if (search) {
      const like = `%${search}%`;
      queryBuilder.andWhere(
        '(course.name LIKE :like OR CAST(courseGroup.groupNumber AS TEXT) LIKE :like OR professor.username LIKE :like OR professor.firstName LIKE :like OR professor.lastName LIKE :like)',
        { like },
      );
    }

    const [groups, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const groupIds = groups.map((group) => group.id);
    let counts = new Map<number, number>();

    if (groupIds.length) {
      const rows = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .select('enrollment.groupId', 'groupId')
        .addSelect('COUNT(enrollment.id)', 'count')
        .where('enrollment.groupId IN (:...groupIds)', { groupIds })
        .andWhere('enrollment.isActive = true')
        .groupBy('enrollment.groupId')
        .getRawMany();

      counts = new Map(
        rows.map((row) => [Number(row.groupId), Number(row.count)]),
      );
    }

    const items = groups.map((group) =>
      this.mapToGroupResponse(group, counts.get(group.id) ?? 0),
    );

    return {
      items,
      meta: buildPaginationMeta(total, page, limit, items.length),
    };
  }

  async findOne(id: number): Promise<GroupResponse> {
    const group = await this.getGroupOrFail(id);
    const currentEnrollment = await this.enrollmentRepository.count({
      where: { group: { id }, isActive: true },
    });
    await this.courseGroupRepository.update(id, {
      currentEnrollment: currentEnrollment,
    });
    group.currentEnrollment = currentEnrollment;
    return this.mapToGroupResponse(group, currentEnrollment);
  }

  async update(
    id: number,
    updateCourseGroupDto: UpdateCourseGroupDto,
  ): Promise<GroupResponse> {
    const group = await this.getGroupOrFail(id);

    if (typeof updateCourseGroupDto.courseId === 'number') {
      const course = await this.courseRepository.findOne({
        where: { id: updateCourseGroupDto.courseId },
      });

      if (!course) {
        throw new NotFoundException('درس یافت نشد');
      }

      group.courseId = course.id;
      group.course = course;
    }

    if (typeof updateCourseGroupDto.professorId === 'number') {
      const professor = await this.userRepository.findOne({
        where: { id: updateCourseGroupDto.professorId },
      });

      if (!professor) {
        throw new NotFoundException('استاد یافت نشد');
      }

      group.professorId = professor.id;
      group.professor = professor;
    }

    if (updateCourseGroupDto.capacity !== undefined) {
      group.capacity = updateCourseGroupDto.capacity ?? null;
    }

    try {
      const saved = await this.courseGroupRepository.save(group);
      return this.mapToGroupResponse(saved);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new BadRequestException('شماره گروه باید یکتا باشد');
      }
      throw error;
    }
  }

  async remove(id: number) {
    return this.courseGroupRepository.manager.transaction(async (manager) => {
      const group = await this.getGroupOrFail(id, manager);

      await manager
        .createQueryBuilder()
        .update(Enrollment)
        .set({ isActive: false })
        .where('groupId = :groupId', { groupId: id })
        .execute();

      await manager.delete(CourseGroup, id);

      return {
        message: 'گروه درسی و ثبت‌نام‌های مربوطه با موفقیت حذف شدند',
      };
    });
  }

  async getGroupStudents(groupId: number): Promise<GroupStudentsResponse> {
    const group = await this.courseGroupRepository.findOne({
      where: { id: groupId },
      relations: ['course'],
    });

    if (!group) {
      throw new NotFoundException('گروه درسی یافت نشد');
    }

    const assignedEnrollments = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .where('enrollment.groupId = :groupId', { groupId })
      .andWhere('enrollment.isActive = true')
      .andWhere('student.isActive = true')
      .getMany();

    let activeEnrollments = assignedEnrollments;

    if (activeEnrollments.length === 0) {
      activeEnrollments = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .leftJoinAndSelect('enrollment.student', 'student')
        .where('enrollment.courseId = :courseId', {
          courseId: group.courseId,
        })
        .andWhere('enrollment.isActive = true')
        .andWhere('student.isActive = true')
        .andWhere('enrollment.groupId IS NULL')
        .getMany();
    }

    const students: GroupStudentSummary[] = activeEnrollments
      .filter((enrollment) => enrollment.student)
      .map((enrollment) => ({
        id: enrollment.student.id,
        username: enrollment.student.username,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        isEnrolled: true,
        canEnroll: false,
      }));

    const currentEnrollment = students.length;
    let studentSummaries = students;

    if (studentSummaries.length === 0) {
      const fallbackStudents = await this.userRepository
        .createQueryBuilder('student')
        .where('student.role = :role', { role: UserRole.STUDENT })
        .andWhere('student.isActive = true')
        .andWhere('student.groupId = :groupId', { groupId })
        .orderBy('student.username', 'ASC')
        .getMany();

      let usersToMap = fallbackStudents;

      if (usersToMap.length === 0) {
        usersToMap = await this.userRepository
          .createQueryBuilder('student')
          .where('student.role = :role', { role: UserRole.STUDENT })
          .andWhere('student.isActive = true')
          .orderBy('student.username', 'ASC')
          .getMany();
      }

      studentSummaries = usersToMap.map((student) => ({
        id: student.id,
        username: student.username,
        firstName: student.firstName,
        lastName: student.lastName,
        isEnrolled: false,
        canEnroll: true,
      }));
    }

    await this.courseGroupRepository.update(groupId, {
      currentEnrollment,
    });

    return {
      students: studentSummaries,
      groupInfo: this.buildGroupInfo(group, currentEnrollment),
    };
  }

  async addStudents(
    groupId: number,
    studentIds: number[],
    createdById: number,
  ) {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new BadRequestException('studentIds نباید خالی باشد');
    }

    const uniqueIds = Array.from(new Set(studentIds));

    return this.courseGroupRepository.manager.transaction(async (manager) => {
      const group = await this.getGroupOrFail(groupId, manager);
      const creator = await this.ensureCreator(manager, createdById);

      const students = await manager.find(User, {
        where: { id: In(uniqueIds) },
      });
      const studentMap = new Map(
        students.map((student) => [student.id, student]),
      );

      const state: EnrollmentState = {
        activeStudentIds: await this.getActiveStudentIds(manager, groupId),
        otherGroupStudentIds: await this.getOtherGroupStudentIds(
          manager,
          group.courseId,
          groupId,
        ),
        currentEnrollment: 0,
      };
      state.currentEnrollment = state.activeStudentIds.size;

      const successful: Array<{ id: number; username: string }> = [];
      const errors: Array<{ studentId: number; reason: string }> = [];

      for (const id of uniqueIds) {
        const student = studentMap.get(id);

        if (!student) {
          errors.push({
            studentId: id,
            reason: 'دانشجو یافت نشد',
          });
          continue;
        }

        const failureReason = await this.attemptEnrollStudent(
          manager,
          group,
          creator,
          student,
          state,
        );

        if (failureReason) {
          errors.push({ studentId: id, reason: failureReason });
        } else {
          successful.push({ id: student.id, username: student.username });
        }
      }

      await manager.update(
        CourseGroup,
        { id: groupId },
        {
          currentEnrollment: state.currentEnrollment,
        },
      );

      return {
        successful,
        errors,
        groupInfo: this.buildGroupInfo(group, state.currentEnrollment),
      };
    });
  }

  async removeStudents(groupId: number, studentIds: number[]) {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new BadRequestException('studentIds نباید خالی باشد');
    }

    const uniqueIds = Array.from(new Set(studentIds));

    return this.courseGroupRepository.manager.transaction(async (manager) => {
      const group = await this.getGroupOrFail(groupId, manager);

      const enrollments = await manager.find(Enrollment, {
        where: {
          group: { id: groupId },
          student: { id: In(uniqueIds) },
          isActive: true,
        },
        relations: ['student'],
      });

      const enrollmentMap = new Map(
        enrollments.map((enrollment) => [enrollment.student.id, enrollment]),
      );

      const state: EnrollmentState = {
        activeStudentIds: await this.getActiveStudentIds(manager, groupId),
        otherGroupStudentIds: new Set(),
        currentEnrollment: 0,
      };
      state.currentEnrollment = state.activeStudentIds.size;

      const successful: number[] = [];
      const errors: Array<{ studentId: number; reason: string }> = [];

      for (const id of uniqueIds) {
        const enrollment = enrollmentMap.get(id);

        if (!enrollment) {
          errors.push({
            studentId: id,
            reason: 'ثبت‌نام فعال برای دانشجو یافت نشد',
          });
          continue;
        }

        enrollment.isActive = false;
        await manager.save(enrollment);
        successful.push(id);
        state.activeStudentIds.delete(id);
        state.currentEnrollment = Math.max(state.currentEnrollment - 1, 0);
      }

      await manager.update(
        CourseGroup,
        { id: groupId },
        {
          currentEnrollment: state.currentEnrollment,
        },
      );

      return {
        successful,
        errors,
        groupInfo: this.buildGroupInfo(group, state.currentEnrollment),
      };
    });
  }

  async addStudentsByUsernames(
    groupId: number,
    usernames: string[],
    createdById: number,
  ) {
    if (!Array.isArray(usernames) || usernames.length === 0) {
      throw new BadRequestException('لیست نام‌های کاربری نباید خالی باشد');
    }

    const sanitizedUsernames = Array.from(
      new Set(
        usernames
          .map((username) => username?.trim())
          .filter((username): username is string => Boolean(username)),
      ),
    );

    if (!sanitizedUsernames.length) {
      throw new BadRequestException('نام کاربری معتبری ارسال نشده است');
    }

    return this.courseGroupRepository.manager.transaction(async (manager) => {
      const group = await this.getGroupOrFail(groupId, manager);
      const creator = await this.ensureCreator(manager, createdById);

      const students = await manager.find(User, {
        where: {
          username: In(sanitizedUsernames),
        },
      });

      const studentByUsername = new Map(
        students.map((student) => [student.username, student]),
      );

      const state: EnrollmentState = {
        activeStudentIds: await this.getActiveStudentIds(manager, groupId),
        otherGroupStudentIds: await this.getOtherGroupStudentIds(
          manager,
          group.courseId,
          groupId,
        ),
        currentEnrollment: 0,
      };
      state.currentEnrollment = state.activeStudentIds.size;

      const successful: Array<{ username: string }> = [];
      const errors: Array<{ username: string; reason: string }> = [];

      for (const username of sanitizedUsernames) {
        const student = studentByUsername.get(username);

        if (!student) {
          errors.push({ username, reason: 'دانشجو یافت نشد' });
          continue;
        }

        const failureReason = await this.attemptEnrollStudent(
          manager,
          group,
          creator,
          student,
          state,
        );

        if (failureReason) {
          errors.push({ username, reason: failureReason });
        } else {
          successful.push({ username });
        }
      }

      await manager.update(
        CourseGroup,
        { id: groupId },
        {
          currentEnrollment: state.currentEnrollment,
        },
      );

      return {
        successful,
        errors,
        groupInfo: this.buildGroupInfo(group, state.currentEnrollment),
      };
    });
  }

  async bulkEnroll(groupId: number, usernames: string[], createdById: number) {
    return this.addStudentsByUsernames(groupId, usernames, createdById);
  }

  async getAvailableStudents(groupId: number, search?: string) {
    const group = await this.getGroupOrFail(groupId);
    const manager = this.courseGroupRepository.manager;

    const activeStudentIds = await this.getActiveStudentIds(manager, groupId);
    const otherGroupStudentIds = await this.getOtherGroupStudentIds(
      manager,
      group.courseId,
      groupId,
    );

    const query = this.userRepository
      .createQueryBuilder('student')
      .where('student.role = :role', { role: UserRole.STUDENT })
      .andWhere('student.isActive = true');

    if (activeStudentIds.size) {
      query.andWhere('student.id NOT IN (:...activeIds)', {
        activeIds: Array.from(activeStudentIds),
      });
    }

    if (search) {
      const like = `%${search}%`;
      query.andWhere(
        '(student.username LIKE :like OR student.firstName LIKE :like OR student.lastName LIKE :like)',
        { like },
      );
    }

    const students = await query.orderBy('student.username', 'ASC').getMany();
    const canAcceptMore =
      typeof group.capacity === 'number' && group.capacity > 0
        ? activeStudentIds.size < group.capacity
        : true;

    return {
      students: students.map((student) => ({
        id: student.id,
        username: student.username,
        firstName: student.firstName,
        lastName: student.lastName,
        isEnrolled: false,
        canEnroll: canAcceptMore && !otherGroupStudentIds.has(student.id),
      })),
    };
  }

  async findAvailableGroups(courseId: number): Promise<GroupResponse[]> {
    const groups = await this.courseGroupRepository.find({
      where: { course: { id: courseId } },
      relations: ['course', 'professor'],
      order: { groupNumber: 'ASC' },
    });

    const groupIds = groups.map((group) => group.id);
    let counts = new Map<number, number>();

    if (groupIds.length) {
      const rows = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .select('enrollment.groupId', 'groupId')
        .addSelect('COUNT(enrollment.id)', 'count')
        .where('enrollment.groupId IN (:...groupIds)', { groupIds })
        .andWhere('enrollment.isActive = true')
        .groupBy('enrollment.groupId')
        .getRawMany();

      counts = new Map(
        rows.map((row) => [Number(row.groupId), Number(row.count)]),
      );
    }

    return groups.map((group) =>
      this.mapToGroupResponse(group, counts.get(group.id) ?? 0),
    );
  }
}
