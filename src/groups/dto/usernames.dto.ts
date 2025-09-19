import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class UsernamesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  usernames: string[];
}
