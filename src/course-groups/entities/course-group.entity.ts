import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { Enrollment } from '../../enrollment/entities/enrollment.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
@Unique(['groupNumber'])
export class CourseGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupNumber: number;

  @Column()
  capacity: number;

  @Column({ default: 0 })
  currentEnrollment: number;

  @ManyToOne(() => Course)
  course: Course;

  @ManyToOne(() => User)
  professor: User;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.group)
  enrollments: Enrollment[];
}
