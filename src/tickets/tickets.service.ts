import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Comment } from './entities/comment.entity';
import { Ticket } from './entities/ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createTicketDto: CreateTicketDto, userId: number) {
    const ticket = this.ticketRepository.create({
      ...createTicketDto,
      createdById: userId,
    });

    const savedTicket = await this.ticketRepository.save(ticket);

    this.eventEmitter.emit('ticket.created', {
      ticketId: savedTicket.id,
      userId,
      title: savedTicket.title,
      timestamp: new Date(),
    });

    return this.findOne(savedTicket.id);
  }

  async findAll(page: number, limit: number, filters: any) {
    const queryBuilder = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.createdBy', 'user')
      .where('ticket.deletedAt IS NULL');

    // Removed status filter

    const [items, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['createdBy', 'comments', 'comments.createdBy'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async update(id: number, updateTicketDto: UpdateTicketDto, userId: number) {
    const ticket = await this.findOne(id);

    // Removed status change event

    Object.assign(ticket, updateTicketDto);
    return await this.ticketRepository.save(ticket);
  }

  async remove(id: number) {
    const ticket = await this.findOne(id);
    await this.ticketRepository.softRemove(ticket);
  }

  async addComment(ticketId: number, userId: number, text: string) {
    return await this.ticketRepository.manager.transaction(async (manager) => {
      const ticket = await manager.findOne(Ticket, {
        where: { id: ticketId },
        relations: ['createdBy'],
      });

      if (!ticket) {
        throw new NotFoundException('تیکت یافت نشد');
      }

      const user = await manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('کاربر یافت نشد');
      }

      const comment = manager.create(Comment, {
        text,
        ticket,
        user,
        createdBy: user,
      });

      await manager.save(comment);

      // Mark ticket as responded if admin replies
      if (user.role === UserRole.ADMIN) {
        ticket.responded = true;
        await manager.save(ticket);
      }

      return comment;
    });
  }

  async getTickets() {
    return await this.ticketRepository.find({
      relations: {
        createdBy: true,
        comments: {
          user: true,
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        responded: true,
        comments: {
          id: true,
          text: true,
          createdAt: true,
          user: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      order: {
        createdAt: 'DESC',
        comments: {
          createdAt: 'ASC',
        },
      },
    });
  }

  async getComments(ticketId: number) {
    const ticket = await this.findOne(ticketId);

    return this.commentRepository.find({
      where: { ticket: { id: ticketId } },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async getUserTickets(userId: number, page: number, limit: number) {
    const [items, total] = await this.ticketRepository.findAndCount({
      where: { createdById: userId },
      relations: ['comments'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
