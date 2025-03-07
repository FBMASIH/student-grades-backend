import { EntityRepository, Repository } from 'typeorm';
import { CourseAssignment } from './entities/course-assignment.entity';

@EntityRepository(CourseAssignment)
export class CourseAssignmentRepository extends Repository<CourseAssignment> {}
