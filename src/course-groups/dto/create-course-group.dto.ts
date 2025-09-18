import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class CreateCourseGroupDto {
  @IsInt()
  @IsPositive()
  courseId: number;

  @IsInt()
  @IsPositive()
  professorId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;
}
