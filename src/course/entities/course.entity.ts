import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourseGroup } from '../../course-groups/entities/course-group.entity';
import { Enrollment } from '../../enrollment/entities/enrollment.entity';
import { User } from '../../users/entities/user.entity';
import { CourseAssignment } from '../../course-assignments/entities/course-assignment.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column()
  subject: string;

  @OneToMany(() => CourseGroup, (group) => group.course)
  groups: CourseGroup[];

  @ManyToOne(() => User, (user) => user.courses)
  professor: User;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @OneToMany(() => CourseAssignment, courseAssignment => courseAssignment.course)
  courseAssignments: CourseAssignment[];

  @Column({ default: true })
  isActive: boolean;
}
