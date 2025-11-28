import {
  Controller,
  Get,
  Post,
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
import {
  FacultyMembersService,
  type FacultyMemberDto,
} from '../services/faculty-members.service.js';
import { QueryMembersDto } from '../dto/query-members.dto.js';
import type { PaginatedResult } from '../../common/pagination/pagination.dto.js';
import {
  CreateMemberDto,
  MemberResponseDto,
} from '../dto/create-member.dto.js';
import {
  CurrentUser,
  type JwtPayload,
} from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('Faculty Members')
@ApiBearerAuth()
@Controller('faculties/:id')
export class FacultyMembersController {
  constructor(private readonly membersService: FacultyMembersService) {}

  @Get('professors')
  @ApiOperation({ summary: 'List professors in faculty' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiResponse({ status: 200, description: 'Professors list' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getProfessors(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryMembersDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PaginatedResult<FacultyMemberDto>> {
    return this.membersService.getProfessors(id, query, currentUser);
  }

  @Post('professors')
  @Roles('super_admin', 'faculty_admin')
  @ApiOperation({ summary: 'Create professor and add to faculty' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiResponse({
    status: 201,
    description: 'Professor created/linked',
    type: MemberResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'User exists with different role' })
  async createProfessor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMemberDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<MemberResponseDto> {
    return this.membersService.createProfessor(id, dto, currentUser);
  }

  @Post('professors/:professorId')
  @Roles('super_admin', 'faculty_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add existing user as professor' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiParam({ name: 'professorId', description: 'Professor user ID' })
  @ApiResponse({ status: 204, description: 'Professor added' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Already assigned' })
  async addProfessor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('professorId', ParseUUIDPipe) professorId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.membersService.addProfessor(id, professorId, currentUser);
  }

  @Delete('professors/:professorId')
  @Roles('super_admin', 'faculty_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove professor from faculty' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiParam({ name: 'professorId', description: 'Professor user ID' })
  @ApiResponse({ status: 204, description: 'Professor removed' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async removeProfessor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('professorId', ParseUUIDPipe) professorId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.membersService.removeProfessor(id, professorId, currentUser);
  }

  @Get('students')
  @ApiOperation({ summary: 'List students in faculty' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiResponse({ status: 200, description: 'Students list' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getStudents(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryMembersDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PaginatedResult<FacultyMemberDto>> {
    return this.membersService.getStudents(id, query, currentUser);
  }

  @Post('students')
  @Roles('super_admin', 'faculty_admin')
  @ApiOperation({ summary: 'Create student and add to faculty' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiResponse({
    status: 201,
    description: 'Student created/linked',
    type: MemberResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'User exists with different role' })
  async createStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMemberDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<MemberResponseDto> {
    return this.membersService.createStudent(id, dto, currentUser);
  }

  @Post('students/:studentId')
  @Roles('super_admin', 'faculty_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add existing user as student' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiParam({ name: 'studentId', description: 'Student user ID' })
  @ApiResponse({ status: 204, description: 'Student added' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Already assigned' })
  async addStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.membersService.addStudent(id, studentId, currentUser);
  }

  @Delete('students/:studentId')
  @Roles('super_admin', 'faculty_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove student from faculty' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiParam({ name: 'studentId', description: 'Student user ID' })
  @ApiResponse({ status: 204, description: 'Student removed' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async removeStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.membersService.removeStudent(id, studentId, currentUser);
  }

  @Get('admins')
  @ApiOperation({ summary: 'Get faculty admins' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiResponse({ status: 200, description: 'Faculty admins list' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getFacultyAdmins(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<FacultyMemberDto[]> {
    return this.membersService.getFacultyAdmins(id, currentUser);
  }

  @Post('admins/:userId')
  @Roles('super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add faculty admin (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'Faculty admin added' })
  @ApiResponse({ status: 403, description: 'Super Admin only' })
  @ApiResponse({ status: 409, description: 'Already admin or is student' })
  async addFacultyAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.membersService.addFacultyAdmin(id, userId, currentUser);
  }

  @Delete('admins/:userId')
  @Roles('super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove faculty admin (Super Admin only)' })
  @ApiParam({ name: 'id', description: 'Faculty ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'Faculty admin removed' })
  @ApiResponse({ status: 403, description: 'Super Admin only' })
  @ApiResponse({ status: 404, description: 'Not a faculty admin' })
  async removeFacultyAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    return this.membersService.removeFacultyAdmin(id, userId, currentUser);
  }
}
