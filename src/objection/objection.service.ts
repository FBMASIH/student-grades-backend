import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../course/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { Objection } from './entities/objection.entity';

@Injectable()
export class ObjectionService {
  constructor(
    @InjectRepository(Objection)
    private objectionRepository: Repository<Objection>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async submitObjection({
    courseId,
    studentId,
    reason,
  }: {
    courseId: number;
    studentId: number;
    reason: string;
  }) {
    // First verify that both course and student exist
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const student = await this.userRepository.findOne({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const objection = this.objectionRepository.create({
      courseId,
      studentId,
      reason,
    });

    return await this.objectionRepository.save(objection);
  }

  async getObjections() {
    return await this.objectionRepository.find();
  }

  async resolveObjection(id: number) {
    const objection = await this.objectionRepository.findOne({
      where: { id: id },
    });
    if (!objection) throw new NotFoundException('اعتراض یافت نشد.');

    // Instead of removing, mark as resolved
    objection.resolved = true;
    await this.objectionRepository.save(objection);

    return { message: 'اعتراض با موفقیت بررسی و ثبت شد.' };
  }

  async getTeacherObjections(teacherId: number) {
    return await this.objectionRepository
      .createQueryBuilder('objection')
      .leftJoinAndSelect('objection.course', 'course')
      .leftJoinAndSelect('objection.student', 'student')
      .leftJoin('course.groups', 'groups')
      .where('groups.professorId = :teacherId', { teacherId })
      .getMany();
  }

  async respondToObjection(id: number, response: string) {
    const objection = await this.objectionRepository.findOne({
      where: { id },
    });

    if (!objection) {
      throw new NotFoundException('اعتراض یافت نشد.');
    }

    objection.response = response;
    objection.resolved = true;
    await this.objectionRepository.save(objection);

    return { message: 'پاسخ با موفقیت ثبت شد.' };
  }

  async getStudentObjections(studentId: number) {
    const objections = await this.objectionRepository
      .createQueryBuilder('objection')
      .leftJoinAndSelect('objection.course', 'course')
      .leftJoinAndSelect('objection.student', 'student')
      .where('objection.student.id = :studentId', { studentId })
      .orderBy('objection.createdAt', 'DESC')
      .getMany();

    return objections.map((objection) => ({
      id: objection.id,
      courseName: objection.course.name,
      reason: objection.reason,
      status: objection.resolved ? 'پاسخ داده شده' : 'در انتظار بررسی',
      response: objection.response,
      createdAt: objection.createdAt,
      resolved: objection.resolved,
    }));
  }
}
