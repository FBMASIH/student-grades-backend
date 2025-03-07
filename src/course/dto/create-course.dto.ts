import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  // Remove unit and faculty validations if they exist
  // @IsNumber()
  // unit: number;

  // @IsString()
  // faculty: string;
}
