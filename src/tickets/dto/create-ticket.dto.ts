import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { TicketPriority } from '../enums/ticket-priority.enum';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsEnum(TicketPriority)
  priority: TicketPriority;
}
