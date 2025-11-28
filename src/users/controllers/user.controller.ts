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
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from '../services/user.service.js';
import type {
  UserFacultyDto,
  UserAssociationsDto,
  AvailableViewsDto,
  EmailCheckResultDto,
} from '../dto/user-associations.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UpdateUserDto, UpdatePasswordDto } from '../dto/update-user.dto.js';
import { QueryUserDto } from '../dto/query-user.dto.js';
import {
  UserResponseDto,
  PaginatedUserResponseDto,
} from '../dto/user-response.dto.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: JwtPayload): Promise<UserResponseDto> {
    return this.userService.findOne(user.sub, user);
  }

  @Get('me/faculties')
  @ApiOperation({ summary: 'Get faculties accessible to current user' })
  @ApiQuery({
    name: 'view',
    required: false,
    description:
      'Filter by active view role (faculty_admin, professor, student)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of faculties user has access to',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyFaculties(
    @CurrentUser() user: JwtPayload,
    @Query('view') view?: string,
  ): Promise<UserFacultyDto[]> {
    return this.userService.getMyFaculties(user, view);
  }

  @Get('me/available-views')
  @ApiOperation({ summary: 'Get available view roles for current user' })
  @ApiResponse({
    status: 200,
    description: 'Available views the user can switch between',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAvailableViews(
    @CurrentUser() user: JwtPayload,
  ): Promise<AvailableViewsDto> {
    return this.userService.getAvailableViews(user);
  }

  @Get('check-email')
  @ApiOperation({ summary: 'Check if email exists and get basic user info' })
  @ApiResponse({
    status: 200,
    description: 'Email check result',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkEmail(
    @Query('email') email: string,
  ): Promise<EmailCheckResultDto> {
    return this.userService.checkEmailExists(email);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<UserResponseDto> {
    return this.userService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get users (filtered by role permissions)' })
  @ApiResponse({
    status: 200,
    description: 'List of users',
    type: PaginatedUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query() query: QueryUserDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedUserResponseDto> {
    return this.userService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (filtered by role permissions)' })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - no access to this user',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<UserResponseDto> {
    return this.userService.findOne(id, user);
  }

  @Get(':id/associations')
  @ApiOperation({
    summary: 'Get user faculty and subject associations (super admin only)',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User associations',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserAssociations(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<UserAssociationsDto> {
    return this.userService.getUserAssociations(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user details (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<UserResponseDto> {
    return this.userService.update(id, dto, user);
  }

  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update user password (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 204, description: 'Password updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updatePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePasswordDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.userService.updatePassword(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete user (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.userService.softDelete(id, user);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore soft-deleted user (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'User restored successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<UserResponseDto> {
    return this.userService.restore(id, user);
  }
}
