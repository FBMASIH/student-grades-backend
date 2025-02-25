import { TicketPriority } from '../enums/ticket-priority.enum';
import { TicketStatus } from '../enums/ticket-status.enum';
import { CommentResponseDto } from './comment-response.dto';

export class TicketResponseDto {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdById: number;
  createdBy: {
    id: number;
    username: string;
  };
  comments?: CommentResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
