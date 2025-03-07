import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HasRoles } from '../auth/role/roles.decorator';
import { RolesGuard } from '../auth/role/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketOwnerGuard } from './guards/ticket-owner.guard';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ticket' })
  @HasRoles(UserRole.STUDENT)
  create(
    @Body() createTicketDto: CreateTicketDto,
    @GetUser('id') userId: number,
  ) {
    return this.ticketsService.create(createTicketDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tickets with filters' })
  findAll(
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
  ) {
    return this.ticketsService.findAll(page, limit, {});
  }

  @Get(':id')
  @UseGuards(TicketOwnerGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  @HasRoles(UserRole.ADMIN, UserRole.TEACHER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTicketDto: UpdateTicketDto,
    @GetUser('id') userId: number,
  ) {
    return this.ticketsService.update(id, updateTicketDto, userId);
  }

  @Delete(':id')
  @HasRoles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.remove(id);
  }

  @Post(':id/comments')
  @UseGuards(TicketOwnerGuard)
  addComment(
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() createCommentDto: CreateCommentDto,
    @GetUser('id') userId: number,
  ) {
    return this.ticketsService.addComment(
      ticketId,
      userId,
      createCommentDto.text,
    ); // Fixed order of parameters
  }

  @Get(':id/comments')
  @UseGuards(TicketOwnerGuard)
  getComments(@Param('id', ParseIntPipe) ticketId: number) {
    return this.ticketsService.getComments(ticketId);
  }

  @Get('user/me')
  getUserTickets(
    @GetUser('id') userId: number,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
  ) {
    return this.ticketsService.getUserTickets(userId, page, limit);
  }
}
