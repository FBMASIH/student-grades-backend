import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { Enrollment } from '../../enrollment/entities/enrollment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('course_groups')
@Unique(['groupNumber', 'courseId'])
export class CourseGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupNumber: number;

  @Column({ default: 0 })
  currentEnrollment: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  courseId: number;

  @ManyToOne(() => User, { nullable: true })
  professor: User | null;

  @Column()
  professorId: number;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.group, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  enrollments: Enrollment[];

  @Column({ default: true })
  isActive: boolean;
}
