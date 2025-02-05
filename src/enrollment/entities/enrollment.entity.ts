import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CourseGroup } from '../../course-groups/entities/course-group.entity';

@Entity()
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  student: User;

  @ManyToOne(() => CourseGroup, group => group.enrollments)
  group: CourseGroup;

  @Column({ nullable: true, type: 'float' })
  score: number;

  @CreateDateColumn()
  enrollmentDate: Date;

  @Column({ default: true })
  isActive: boolean;
}
