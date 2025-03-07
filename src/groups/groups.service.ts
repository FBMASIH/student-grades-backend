import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { CourseAssignment } from '../course-assignments/entities/course-assignment.entity';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { Group } from './entities/group.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(CourseAssignment)
    private readonly courseAssignmentRepository: Repository<CourseAssignment>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  async create(createGroupDto: CreateGroupDto): Promise<Group> {
    const group = this.groupRepository.create(createGroupDto);
    return this.groupRepository.save(group);
  }

  async findAll(
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
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
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
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStudentsByGroup(groupId: number) {
    const students = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.course', 'course')
      .innerJoin('course_assignments', 'ca', 'ca.courseId = course.id AND ca.groupId = :groupId', { groupId })
      .where('enrollment.isActive = :isActive', { isActive: true })
      .andWhere('student.isActive = :isActive', { isActive: true })
      .select([
        'student.id',
        'student.firstName',
        'student.lastName',
        'student.username',
        'course.id',
        'course.name',
        'course.code',
        'enrollment.score',
      ])
      .getMany();

    return {
      students: students.map((enrollment) => ({
        ...enrollment.student,
        course: enrollment.course,
        score: enrollment.score,
      })),
    };
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.groupRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Group not found');
    }
    return { message: 'Group deleted successfully' };
  }
}
