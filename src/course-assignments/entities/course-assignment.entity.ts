import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { User } from '../../users/entities/user.entity';

@Entity('course_assignments')
export class CourseAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupId: number;

  @Column()
  courseId: number;

  @Column()
  professorId: number;

  @Column()
  capacity: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'professorId' })
  professor: User;
}

export interface CourseAssignment {
  id: number;
  groupId: number;
  courseId: number;
  professorId: number;
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
}
