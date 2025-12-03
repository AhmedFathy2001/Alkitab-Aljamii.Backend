import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SubjectService } from '../services/subject.service.js';
import { SubjectAssignmentService } from '../services/subject-assignment.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { SortOrder, type PaginatedResult } from '../../common/pagination/pagination.dto.js';
import { CreateSubjectDto } from '../dto/create-subject.dto.js';
import { UpdateSubjectDto } from '../dto/update-subject.dto.js';
import { QuerySubjectDto } from '../dto/query-subject.dto.js';
import type {
  SubjectResponseDto,
  SubjectAssignmentDto,
} from '../dto/subject-response.dto.js';

@ApiTags('Subjects')
@ApiBearerAuth()
@Controller('subjects')
export class SubjectController {
  constructor(
    private readonly subjectService: SubjectService,
    private readonly assignmentService: SubjectAssignmentService,
  ) {}

  @Post()
  @Roles('super_admin', 'faculty_admin')
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiResponse({ status: 201, description: 'Subject created' })
  async create(
    @Body() dto: CreateSubjectDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SubjectResponseDto> {
    return this.subjectService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List subjects (filtered by role access)' })
  @ApiResponse({ status: 200, description: 'Subjects list' })
  async findAll(
    @Query() query: QuerySubjectDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedResult<SubjectResponseDto>> {
    return this.subjectService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subject by ID' })
  @ApiParam({ name: 'id', description: 'Subject UUID' })
  @ApiResponse({ status: 200, description: 'Subject details' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<SubjectResponseDto> {
    return this.subjectService.findOne(id, user);
  }

  @Patch(':id')
  @Roles('super_admin', 'faculty_admin')
  @ApiOperation({ summary: 'Update subject' })
  @ApiParam({ name: 'id', description: 'Subject UUID' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubjectDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SubjectResponseDto> {
    return this.subjectService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('super_admin', 'faculty_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete subject' })
  @ApiParam({ name: 'id', description: 'Subject UUID' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.subjectService.remove(id, user);
  }

  // Assignment endpoints
  @Get(':id/assignments')
  @ApiOperation({ summary: 'List users assigned to subject' })
  @ApiParam({ name: 'id', description: 'Subject UUID' })
  async getAssignments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedResult<SubjectAssignmentDto>> {
    return this.assignmentService.getAssignments(id, user);
  }

  @Post(':id/assignments/:userId')
  @Roles('super_admin', 'faculty_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Assign user to subject' })
  @ApiParam({ name: 'id', description: 'Subject UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async assignUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('roleInSubject') roleInSubject: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.assignmentService.assignUser(id, userId, roleInSubject, user);
  }

  @Delete(':id/assignments/:userId')
  @Roles('super_admin', 'faculty_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove user from subject' })
  @ApiParam({ name: 'id', description: 'Subject UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async removeUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.assignmentService.removeUser(id, userId, user);
  }
  @Get('faculty')
async getSubjects(
  @Query('page') page?: number,
  @Query('limit') limit?: number,
  @Query('sortBy') sortBy?: string,
  @Query('sortOrder') sortOrder?: SortOrder,
  @Query('facultyName') facultyName?: string,
) {
  return this.subjectService.getSubjects(
    {
      page: page ?? 1,
      limit: limit ?? 10,
      sortBy: sortBy ?? 'createdAt',
      sortOrder: sortOrder ?? SortOrder.DESC, // استخدم enum بدل string
    },
    facultyName,
  );
}
}
