import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { Enrollment } from '../enrollment/entities/enrollment.entity';

@Injectable()
export class ScoresService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
  ) {}

  async exportScores(courseId?: number, studentId?: number) {
    const queryBuilder = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('enrollment.student', 'student');

    if (courseId) {
      queryBuilder.andWhere('course.id = :courseId', { courseId });
    }

    if (studentId) {
      queryBuilder.andWhere('student.id = :studentId', { studentId });
    }

    const enrollments = await queryBuilder.getMany();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Scores');

    worksheet.columns = [
      { header: 'Enrollment ID', key: 'id', width: 15 },
      { header: 'Course Name', key: 'courseName', width: 30 },
      { header: 'Course Code', key: 'courseCode', width: 15 },
      { header: 'Student Username', key: 'studentUsername', width: 20 },
      { header: 'Score', key: 'score', width: 10 },
    ];

    enrollments.forEach((enrollment) => {
      worksheet.addRow({
        id: enrollment.id,
        courseName: enrollment.course.name,
        courseCode: enrollment.course.code,
        studentUsername: enrollment.student.username,
        score: enrollment.score,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async importScores(file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new BadRequestException('Worksheet not found');
    }
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ row: number; message: string }>,
    };

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const enrollmentId = row.getCell(1).value as number;
      const score = row.getCell(5).value as number;

      if (score < 0 || score > 100) {
        results.failed++;
        results.errors.push({
          row: i,
          message: 'Score must be between 0 and 100',
        });
        continue;
      }

      try {
        const enrollment = await this.enrollmentRepository.findOne({
          where: { id: enrollmentId },
          relations: ['student', 'course'],
        });

        if (!enrollment) {
          throw new NotFoundException('Enrollment not found');
        }

        enrollment.score = score;
        await this.enrollmentRepository.save(enrollment);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i,
          message: error.message || 'Error updating score',
        });
      }
    }

    return results;
  }

  async updateScore(enrollmentId: number, score: number) {
    if (score < 0 || score > 100) {
      throw new BadRequestException('Score must be between 0 and 100');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['student', 'course'],
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    enrollment.score = score;
    await this.enrollmentRepository.save(enrollment);
    return enrollment;
  }
}
