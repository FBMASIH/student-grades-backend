import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class ManageStudentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  studentIds: number[];
}
