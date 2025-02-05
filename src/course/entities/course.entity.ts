import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CourseGroup } from '../../course-groups/entities/course-group.entity';

@Entity()
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  subject: string;

  @OneToMany(() => CourseGroup, group => group.course)
  groups: CourseGroup[];
}
