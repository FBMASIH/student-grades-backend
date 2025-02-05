import { Course } from 'src/course/entities/course.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Objection {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Course)
  course: Course;

  @ManyToOne(() => User)
  student: User;

  @Column()
  reason: string;

  @Column({ default: false })
  resolved: boolean;
}
