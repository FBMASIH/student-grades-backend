import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Comment } from './comment.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  createdById: number;

  @ManyToOne(() => User)
  createdBy: User;

  @Column({ default: false })
  responded: boolean;

  @OneToMany(() => Comment, (comment) => comment.ticket)
  comments: Comment[];

  @DeleteDateColumn()
  deletedAt?: Date;
}
