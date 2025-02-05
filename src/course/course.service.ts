import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CourseGroup } from '../course-groups/entities/course-group.entity';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course) 
    private courseRepository: Repository<Course>,
    @InjectRepository(CourseGroup)
    private courseGroupRepository: Repository<CourseGroup>,
  ) {}

  // Create a new course with groups
  async createCourse(courseData: { 
    name: string, 
    subject: string,
    groups: { groupNumber: number, capacity: number, professorId: number }[]
  }) {
    const course = this.courseRepository.create({
      name: courseData.name,
      subject: courseData.subject,
    });
    
    const savedCourse = await this.courseRepository.save(course);

    // Create groups for the course
    for (const groupData of courseData.groups) {
      await this.courseGroupRepository.save({
        course: savedCourse,
        groupNumber: groupData.groupNumber,
        capacity: groupData.capacity,
        currentEnrollment: 0,
        professor: { id: groupData.professorId }
      });
    }

    return savedCourse;
  }

  // Get course details with its groups
  async getCourse(courseId: number) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['groups', 'groups.professor']
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
    // Verify enrollment
    const group = await this.courseGroupRepository.findOne({
      where: { 
        course: { id: courseId },
        groupNumber: groupNumber,
      },
      relations: ['enrollments']
    });

    if (!group) {
      throw new NotFoundException('گروه درسی یافت نشد');
    }

    const enrollment = group.enrollments?.find(e => e.student.id === studentId);
    if (!enrollment) {
      throw new BadRequestException('دانشجو در این درس ثبت نام نکرده است');
    }

    // Update the grade
    enrollment.score = score;
    await this.courseGroupRepository.save(group);

    return enrollment;
  }

  // Get all available courses with their groups
  async getAllCourses() {
    return await this.courseRepository.find({
      relations: ['groups', 'groups.professor']
    });
  }

  // Get courses taught by a professor
  async getProfessorCourses(professorId: number) {
    const groups = await this.courseGroupRepository.find({
      where: { professor: { id: professorId } },
      relations: ['course', 'enrollments', 'enrollments.student']
    });

    return groups;
  }
}
