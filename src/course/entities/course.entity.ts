import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CourseGroup } from '../../course-groups/entities/course-group.entity';

@Entity()
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column()
  units: number;

  @Column({ nullable: true })
  department: string;

  @Column()
  subject: string;

  @OneToMany(() => CourseGroup, (group) => group.course)
  groups: CourseGroup[];
}
