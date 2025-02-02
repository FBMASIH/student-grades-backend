import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grade } from './entities/grade.entity';

@Injectable()
export class GradeService {
  constructor(
    @InjectRepository(Grade) private gradeRepository: Repository<Grade>,
  ) {}

  async getStudentGrades(studentId: number) {
    const grades = await this.gradeRepository.find({ where: { student: { id: studentId } } });
    if (!grades.length) throw new NotFoundException('نمره‌ای یافت نشد.');
    return grades;
  }

  async assignGrade({
    studentId,
    subject,
    score,
  }: {
    studentId: number;
    subject: string;
    score: number;
  }) {
    const grade = this.gradeRepository.create({
      student: { id: studentId },
      subject,
      score,
    });
    return await this.gradeRepository.save(grade);
  }
}
