export class CommentResponseDto {
  id: number;
  text: string;
  ticketId: number;
  createdBy: {
    id: number;
    username: string;
  };
  createdAt: Date;
}
