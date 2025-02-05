import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { Enrollment } from '../../enrollment/entities/enrollment.entity';

@Entity()
export class CourseGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupNumber: number;

  @Column()
  capacity: number;

  @Column()
  currentEnrollment: number;

  @ManyToOne(() => Course)
  course: Course;

  @ManyToOne(() => User)
  professor: User;

  @OneToMany(() => Enrollment, enrollment => enrollment.group)
  enrollments: Enrollment[];
}