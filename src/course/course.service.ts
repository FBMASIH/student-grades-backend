import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { buildPaginationMeta } from '../common/utils/pagination.util';
import { CourseGroup } from '../course-groups/entities/course-group.entity';
import { CreateCourseDto } from './dto/create-grade.dto';
import { Course } from './entities/course.entity';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(CourseGroup)
    private courseGroupRepository: Repository<CourseGroup>,
  ) {}

  async getAllCourses(options?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Course>> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const search = options?.search;

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
      meta: buildPaginationMeta(total, page, limit, items.length),
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

  async create(createCourseDto: CreateCourseDto) {
    const course = this.courseRepository.create({
      name: createCourseDto.name,
      isActive: true,
    });

    return await this.courseRepository.save(course);
  }

  async update(id: number, updateCourseDto: any) {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    Object.assign(course, updateCourseDto);
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
  async getTeacherCoursesDetails(teacherId: number) {
    return await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.groups', 'group')
      .leftJoinAndSelect('group.enrollments', 'enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .where('group.professor.id = :teacherId', { teacherId })
      .andWhere('enrollment.isActive = :isActive', { isActive: true })
      .andWhere('student.isActive = :isActive', { isActive: true })
      .getMany();
  }

  // Replace getProfessorCourses with this new method
  async getTeacherCourses(teacherId: number) {
    const courses = await this.courseRepository
      .createQueryBuilder('course')
      .innerJoinAndSelect('course.groups', 'groups')
      .where('groups.professor.id = :teacherId', { teacherId })
      .getMany();

    if (!courses.length) {
      throw new NotFoundException('استاد هیچ درسی ندارد');
    }

    return courses.map((course) => ({
      id: course.id,
      name: course.name,
      groups: course.groups.map((group) => ({
        id: group.id,
        groupNumber: group.groupNumber,
      })),
    }));
  }

  async getCourseStudents(courseId: number) {
    const course = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.groups', 'group')
      .leftJoinAndSelect('group.enrollments', 'enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .where('course.id = :courseId', { courseId })
      .andWhere('enrollment.isActive = true')
      .andWhere('student.isActive = true')
      .getOne();

    if (!course) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    // Flatten and transform the data to get unique students
    const students = new Map();
    course.groups.forEach((group) => {
      group.enrollments.forEach((enrollment) => {
        if (enrollment.student) {
          students.set(enrollment.student.id, {
            id: enrollment.student.id,
            username: enrollment.student.username,
            firstName: enrollment.student.firstName,
            lastName: enrollment.student.lastName,
            groupNumber: group.groupNumber,
            score: enrollment.score,
          });
        }
      });
    });

    return Array.from(students.values());
  }
}
