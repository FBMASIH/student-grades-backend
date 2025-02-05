import { PartialType } from '@nestjs/swagger';
import { CreateCourseGroupDto } from './create-course-group.dto';

export class UpdateCourseGroupDto extends PartialType(CreateCourseGroupDto) {}
