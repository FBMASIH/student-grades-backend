import { CourseGroup } from '../../course-groups/entities/course-group.entity';
import { User } from '../../users/entities/user.entity';

export interface EnrollmentResponse {
  id: number;
  student: User;
  group: CourseGroup;
  score?: number;
  createdAt: Date;
  isActive: boolean;
}
