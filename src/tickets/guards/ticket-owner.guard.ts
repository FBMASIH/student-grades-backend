import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../users/entities/user.entity';
import { Ticket } from '../entities/ticket.entity';

@Injectable()
export class TicketOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ticketId = +request.params.id;

    // Admins and teachers can access all tickets
    if (user.role === UserRole.ADMIN || user.role === UserRole.TEACHER) {
      return true;
    }

    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Students can only access their own tickets
    return ticket.createdById === user.id;
  }
}
