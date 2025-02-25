import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { CourseGroup } from '../course-groups/entities/course-group.entity';
import { Course } from './entities/course.entity';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(CourseGroup)
    private courseGroupRepository: Repository<CourseGroup>,
  ) {}

  async getAllCourses(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<PaginatedResponse<Course>> {
    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.groups', 'groups')
      .leftJoinAndSelect('groups.professor', 'professor');

    if (search) {
      queryBuilder.where(
        'course.name LIKE :search OR course.code LIKE :search OR course.department LIKE :search',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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

  async createCourse(data: {
    name: string;
    code: string;
    units: number;
    department?: string;
  }) {
    const course = this.courseRepository.create(data);
    return await this.courseRepository.save(course);
  }

  async updateCourse(
    id: number,
    data: {
      name?: string;
      code?: string;
      units?: number;
      department?: string;
    },
  ) {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    Object.assign(course, data);
    return await this.courseRepository.save(course);
  }

  async deleteCourse(id: number) {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return await this.courseRepository.remove(course);
  }

  // Create a new course with groups
  async createCourseWithGroups(courseData: {
    name: string;
    subject: string;
    groups: { groupNumber: number; capacity: number; professorId: number }[];
  }) {
    return await this.courseRepository.manager.transaction(async (manager) => {
      const course = manager.create(Course, {
        name: courseData.name,
        subject: courseData.subject,
      });

      const savedCourse = await manager.save(course);

      for (const groupData of courseData.groups) {
        if (groupData.capacity <= 0) {
          throw new BadRequestException('ظرفیت گروه باید بیشتر از صفر باشد');
        }

        await manager.save(CourseGroup, {
          course: savedCourse,
          groupNumber: groupData.groupNumber,
          capacity: groupData.capacity,
          currentEnrollment: 0,
          professor: { id: groupData.professorId },
        });
      }

      return await manager.findOne(Course, {
        where: { id: savedCourse.id },
        relations: ['groups', 'groups.professor'],
      });
    });
  }

  // Get course details with its groups
  async getCourse(courseId: number) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['groups', 'groups.professor'],
    });

    if (!course) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    return course;
  }

  // Get student's courses and grades
  async getStudentCourses(studentId: number) {
    const courses = await this.courseRepository
      .createQueryBuilder('course')
      .innerJoinAndSelect('course.groups', 'group')
      .innerJoinAndSelect('group.enrollments', 'enrollment')
      .where('enrollment.student.id = :studentId', { studentId })
      .getMany();

    if (!courses.length) {
      throw new NotFoundException('دانشجو در هیچ درسی ثبت نام نکرده است');
    }

    return courses;
  }

  // Assign/update a grade for a student in a course
  async assignGrade({
    studentId,
    courseId,
    groupNumber,
    score,
  }: {
    studentId: number;
    courseId: number;
    groupNumber: number;
    score: number;
  }) {
    if (score < 0 || score > 20) {
      throw new BadRequestException('نمره باید بین 0 تا 20 باشد');
    }

    return await this.courseRepository.manager.transaction(async (manager) => {
      const group = await manager.findOne(CourseGroup, {
        where: {
          course: { id: courseId },
          groupNumber: groupNumber,
        },
        relations: ['enrollments', 'enrollments.student'],
      });

      if (!group) {
        throw new NotFoundException('گروه درسی یافت نشد');
      }

      const enrollment = group.enrollments?.find(
        (e) => e.student.id === studentId,
      );
      if (!enrollment) {
        throw new BadRequestException('دانشجو در این درس ثبت نام نکرده است');
      }

      enrollment.score = score;
      return await manager.save(enrollment);
    });
  }

  // Get courses taught by a professor
  async getProfessorCourses(professorId: number) {
    const groups = await this.courseGroupRepository.find({
      where: { professor: { id: professorId } },
      relations: ['course', 'enrollments', 'enrollments.student'],
    });

    return groups;
  }

  async getTeacherCoursesDetails(teacherId: number) {
    const courses = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.groups', 'group')
      .leftJoinAndSelect('group.enrollments', 'enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .where('group.professorId = :teacherId', { teacherId })
      .andWhere('enrollment.isActive = :isActive', { isActive: true })
      .getMany();

    return {
      courses: courses.map((course) => ({
        id: course.id,
        name: course.name,
        code: course.code,
        units: course.units,
        groups: course.groups.map((group) => ({
          id: group.id,
          groupNumber: group.groupNumber,
          enrollmentCount: group.enrollments.length,
          students: group.enrollments.map((enrollment) => ({
            id: enrollment.student.id,
            username: enrollment.student.username,
            firstName: enrollment.student.firstName,
            lastName: enrollment.student.lastName,
            score: enrollment.score,
          })),
        })),
      })),
    };
  }
}
