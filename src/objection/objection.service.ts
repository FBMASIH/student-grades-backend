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
    gradeId,
    studentId,
    reason,
  }: {
    gradeId: number;
    studentId: number;
    reason: string;
  }) {
    const objection = this.objectionRepository.create({
      grade: {id: gradeId},
      student: {id: studentId},
      reason,
    });
    return await this.objectionRepository.save(objection);
  }

  async getObjections() {
    return await this.objectionRepository.find();
  }

  async resolveObjection(id: number) {
    const objection = await this.objectionRepository.findOne({ where: { id : id } });
    if (!objection) throw new NotFoundException('اعتراض یافت نشد.');
    await this.objectionRepository.remove(objection);
    return { message: 'اعتراض با موفقیت بررسی و حذف شد.' };
  }
}
