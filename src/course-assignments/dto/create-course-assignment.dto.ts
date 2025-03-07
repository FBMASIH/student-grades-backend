import { IsNumber, Min } from 'class-validator';

export class CreateCourseAssignmentDto {
  @IsNumber()
  groupId: number;

  @IsNumber()
  courseId: number;

  @IsNumber()
  professorId: number;

  @IsNumber()
  @Min(1)
  capacity: number;
}
