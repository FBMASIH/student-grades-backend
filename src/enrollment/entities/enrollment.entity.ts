import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourseGroup } from '../../course-groups/entities/course-group.entity';
import { Course } from '../../course/entities/course.entity';
import { User } from '../../users/entities/user.entity';

@Entity('enrollments')
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.enrollments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column()
  courseId: number;

  @ManyToOne(() => Course, (course) => course.enrollments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @ManyToOne(() => CourseGroup, (courseGroup) => courseGroup.enrollments, {
    nullable: true,
  })
  @JoinColumn({ name: 'groupId' })
  group: CourseGroup | null;

  @Column({ nullable: true })
  groupId: number | null;

  @Column({ nullable: true, type: 'float' })
  score: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'createdById' })
  createdById: number;

  @ManyToOne(() => User, (user) => user.createdEnrollments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;
}
