import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Grade } from '../../grade/entities/grade.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Objection {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Grade)
  grade: Grade;

  @ManyToOne(() => User)
  student: User;

  @Column()
  reason: string;

  @Column({ default: false })
  resolved: boolean;
}
