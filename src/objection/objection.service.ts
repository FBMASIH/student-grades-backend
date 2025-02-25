import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Objection } from './entities/objection.entity';

@Injectable()
export class ObjectionService {
  constructor(
    @InjectRepository(Objection)
    private objectionRepository: Repository<Objection>,
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
    const objection = this.objectionRepository.create({
      course: { id: courseId },
      student: { id: studentId },
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
    await this.objectionRepository.remove(objection);
    return { message: 'اعتراض با موفقیت بررسی و حذف شد.' };
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
}
