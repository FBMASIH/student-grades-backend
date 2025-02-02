import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Grade {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  student: User;

  @Column()
  subject: string;

  @Column()
  score: number;
}
