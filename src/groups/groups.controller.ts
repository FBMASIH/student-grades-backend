import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PaginatedResponse } from '../common/interfaces/pagination.interface';
import { CourseAssignment } from '../course-assignments/entities/course-assignment.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { SubmitGroupScoresDto } from './dto/submit-group-scores.dto';
import { Group } from './entities/group.entity';
import { GroupsService } from './groups.service';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  async create(@Body() createGroupDto: CreateGroupDto): Promise<Group> {
    return this.groupsService.create(createGroupDto);
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<Group>> {
    return this.groupsService.findAll(page, limit, search);
  }

  @Get(':id/assignments')
  async findAssignments(
    @Param('id') id: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginatedResponse<CourseAssignment>> {
    return this.groupsService.findAssignments(id, page, limit);
  }

  @Get(':id/students')
  async getStudentsByGroup(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.getStudentsByGroup(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: number): Promise<{ message: string }> {
    return this.groupsService.remove(id);
  }

  @Post(':id/scores')
  async submitGroupScores(
    @Param('id', ParseIntPipe) groupId: number,
    @Body() submitGroupScoresDto: SubmitGroupScoresDto,
  ) {
    return this.groupsService.submitGroupScores(
      groupId,
      submitGroupScoresDto.scores,
    );
  }
}
