import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourseGroup } from '../../course-groups/entities/course-group.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  student: User;

  @ManyToOne(() => CourseGroup, (group) => group.enrollments, { eager: true })
  group: CourseGroup;

  @Column({ nullable: true, type: 'float' })
  score: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: true })
  isActive: boolean;
}
