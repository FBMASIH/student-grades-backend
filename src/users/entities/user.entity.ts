import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Repository,
} from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { Enrollment } from '../../enrollment/entities/enrollment.entity';
import { Group } from '../../groups/entities/group.entity';

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.student, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  enrollments: Enrollment[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.createdBy, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  createdEnrollments: Enrollment[];

  @OneToMany(() => Course, (course) => course.professor)
  courses: Course[];

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'groupId' })
  group?: Group;

  @Column({ nullable: true })
  groupId?: number;

  static createQueryBuilderWithInactive(repository: Repository<User>) {
    return repository.createQueryBuilder().withDeleted().where('1=1'); // This will bypass the default isActive filter
  }

  static async findOneWithInactive(
    repository: Repository<User>,
    conditions: any,
  ) {
    return repository
      .createQueryBuilder('user')
      .where(conditions)
      .withDeleted()
      .getOne();
  }
}
