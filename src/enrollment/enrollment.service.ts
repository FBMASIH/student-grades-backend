import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseGroup } from '../course-groups/entities/course-group.entity';
import { Enrollment } from './entities/enrollment.entity';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(CourseGroup)
    private courseGroupRepository: Repository<CourseGroup>,
  ) {}

  async enrollStudent(studentId: number, groupId: number) {
    // Check if group exists and has capacity
    const group = await this.courseGroupRepository.findOne({
      where: { id: groupId },
      relations: ['enrollments'],
    });

    if (!group) {
      throw new NotFoundException('گروه درسی یافت نشد');
    }

    if (group.currentEnrollment >= group.capacity) {
      throw new BadRequestException('ظرفیت گروه تکمیل است');
    }

    // Check if student is already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        student: { id: studentId },
        group: { id: groupId },
        isActive: true,
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException('دانشجو قبلا در این گروه ثبت نام کرده است');
    }

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      student: { id: studentId },
      group: { id: groupId },
    });

    await this.enrollmentRepository.save(enrollment);

    // Update group enrollment count
    group.currentEnrollment++;
    await this.courseGroupRepository.save(group);

    return enrollment;
  }

  async submitGrade(enrollmentId: number, score: number) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
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
}
