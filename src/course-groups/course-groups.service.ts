import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseGroup } from './entities/course-group.entity';
import { CreateCourseGroupDto } from './dto/create-course-group.dto';
import { UpdateCourseGroupDto } from './dto/update-course-group.dto';

@Injectable()
export class CourseGroupsService {
  constructor(
    @InjectRepository(CourseGroup)
    private readonly courseGroupRepository: Repository<CourseGroup>,
  ) {}

  async create(createCourseGroupDto: CreateCourseGroupDto) {
    const group = this.courseGroupRepository.create({
      groupNumber: createCourseGroupDto.groupNumber,
      capacity: createCourseGroupDto.capacity,
      currentEnrollment: 0,
      course: { id: createCourseGroupDto.courseId },
      professor: { id: createCourseGroupDto.professorId }
    });
    return await this.courseGroupRepository.save(group);
  }

  async enrollStudent(groupId: number, studentId: number) {
    const group = await this.courseGroupRepository.findOne({
      where: { id: groupId },
      relations: ['course']
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

  async findAvailableGroups(courseId: number) {
    return await this.courseGroupRepository.find({
      where: { 
        course: { id: courseId },
      },
      relations: ['professor']
    });
  }

  findAll() {
    return `This action returns all courseGroups`;
  }

  findOne(id: number) {
    return `This action returns a #${id} courseGroup`;
  }

  update(id: number, updateCourseGroupDto: UpdateCourseGroupDto) {
    return `This action updates a #${id} courseGroup`;
  }

  remove(id: number) {
    return `This action removes a #${id} courseGroup`;
  }
}
