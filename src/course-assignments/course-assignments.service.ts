import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { CreateCourseAssignmentDto } from './dto/create-course-assignment.dto';
import { CourseAssignment } from './entities/course-assignment.entity';

@Injectable()
export class CourseAssignmentsService {
  constructor(
    @InjectRepository(CourseAssignment)
    private courseAssignmentRepository: Repository<CourseAssignment>,
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
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.courseAssignmentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Course assignment not found');
    }
    return { message: 'Course assignment deleted successfully' };
  }
}
