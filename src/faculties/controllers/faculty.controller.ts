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
import { FacultyService } from '../services/faculty.service.js';
import { CreateFacultyDto } from '../dto/create-faculty.dto.js';
import { UpdateFacultyDto } from '../dto/update-faculty.dto.js';
import { QueryFacultyDto } from '../dto/query-faculty.dto.js';
import { FacultyResponseDto, PaginatedFacultyResponseDto } from '../dto/faculty-response.dto.js';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

@ApiTags('Faculties')
@ApiBearerAuth()
@Controller('faculties')
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new faculty (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Faculty created', type: FacultyResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Faculty code already exists' })
  async create(
    @Body() dto: CreateFacultyDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<FacultyResponseDto> {
    return this.facultyService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'List faculties (filtered by role)' })
  @ApiResponse({ status: 200, description: 'Faculties list', type: PaginatedFacultyResponseDto })
  async findAll(
    @Query() query: QueryFacultyDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PaginatedFacultyResponseDto> {
    return this.facultyService.findAll(query, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get faculty by ID' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiResponse({ status: 200, description: 'Faculty found', type: FacultyResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Faculty not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<FacultyResponseDto> {
    return this.facultyService.findOne(id, currentUser);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update faculty (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiResponse({ status: 200, description: 'Faculty updated', type: FacultyResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Faculty not found' })
  @ApiResponse({ status: 409, description: 'Faculty code already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacultyDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<FacultyResponseDto> {
    return this.facultyService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete faculty (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiResponse({ status: 204, description: 'Faculty deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Faculty not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.facultyService.softDelete(id, currentUser);
  }

  @Post(':id/restore')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Restore deleted faculty (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiResponse({ status: 200, description: 'Faculty restored', type: FacultyResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Faculty not found' })
  @ApiResponse({ status: 409, description: 'Faculty is not deleted' })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<FacultyResponseDto> {
    return this.facultyService.restore(id, currentUser);
  }

  @Post(':id/professors/:professorId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FACULTY_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add professor to faculty' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiParam({ name: 'professorId', description: 'Professor user ID' })
  @ApiResponse({ status: 204, description: 'Professor added' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Faculty or professor not found' })
  @ApiResponse({ status: 409, description: 'Professor already assigned' })
  async addProfessor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('professorId', ParseUUIDPipe) professorId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.facultyService.addProfessor(id, professorId, currentUser);
  }

  @Delete(':id/professors/:professorId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FACULTY_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove professor from faculty' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiParam({ name: 'professorId', description: 'Professor user ID' })
  @ApiResponse({ status: 204, description: 'Professor removed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async removeProfessor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('professorId', ParseUUIDPipe) professorId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.facultyService.removeProfessor(id, professorId, currentUser);
  }

  @Post(':id/students/:studentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FACULTY_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add student to faculty' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiParam({ name: 'studentId', description: 'Student user ID' })
  @ApiResponse({ status: 204, description: 'Student added' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Faculty or student not found' })
  @ApiResponse({ status: 409, description: 'Student already assigned' })
  async addStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.facultyService.addStudent(id, studentId, currentUser);
  }

  @Delete(':id/students/:studentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FACULTY_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove student from faculty' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiParam({ name: 'studentId', description: 'Student user ID' })
  @ApiResponse({ status: 204, description: 'Student removed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async removeStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.facultyService.removeStudent(id, studentId, currentUser);
  }
}
