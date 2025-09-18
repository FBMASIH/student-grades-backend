import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class UpdateCourseGroupDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  courseId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  professorId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;
}
