import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketOwnerGuard } from './guards/ticket-owner.guard';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Comment]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [TicketsController],
  providers: [TicketsService, TicketOwnerGuard],
  exports: [TicketsService],
})
export class TicketsModule {}
