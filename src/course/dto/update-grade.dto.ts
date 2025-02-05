import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-grade.dto';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
