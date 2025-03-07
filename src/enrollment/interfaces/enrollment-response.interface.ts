import { Course } from '../../course/entities/course.entity';
import { User } from '../../users/entities/user.entity';

export interface EnrollmentResponse {
  id: number;
  student: User;
  course: Course;
  score: number;
  createdAt: Date;
  isActive: boolean;
}
