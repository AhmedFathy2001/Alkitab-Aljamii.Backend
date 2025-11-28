import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { StatsService } from '../services/stats.service.js';
import {
  SuperAdminStatsDto,
  FacultyAdminStatsDto,
  ProfessorStatsDto,
  StudentStatsDto,
} from '../dto/stats-response.dto.js';

@ApiTags('Stats')
@ApiBearerAuth()
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('super-admin')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get super admin dashboard stats' })
  @ApiResponse({ status: 200, type: SuperAdminStatsDto })
  async getSuperAdminStats(): Promise<SuperAdminStatsDto> {
    return this.statsService.getSuperAdminStats();
  }

  @Get('faculty-admin')
  @Roles('faculty_admin')
  @ApiOperation({
    summary: 'Get faculty admin dashboard stats (uses JWT context)',
  })
  @ApiResponse({ status: 200, type: FacultyAdminStatsDto })
  async getFacultyAdminStats(
    @CurrentUser() user: JwtPayload,
  ): Promise<FacultyAdminStatsDto> {
    // Use facultyId from JWT context
    return this.statsService.getFacultyAdminStats(user, user.facultyId);
  }

  @Get('professor')
  @Roles('professor')
  @ApiOperation({ summary: 'Get professor dashboard stats (uses JWT context)' })
  @ApiResponse({ status: 200, type: ProfessorStatsDto })
  async getProfessorStats(
    @CurrentUser() user: JwtPayload,
  ): Promise<ProfessorStatsDto> {
    // Use facultyId from JWT context
    return this.statsService.getProfessorStats(user, user.facultyId);
  }

  @Get('student')
  @Roles('student')
  @ApiOperation({ summary: 'Get student dashboard stats (uses JWT context)' })
  @ApiResponse({ status: 200, type: StudentStatsDto })
  async getStudentStats(
    @CurrentUser() user: JwtPayload,
  ): Promise<StudentStatsDto> {
    // Use facultyId from JWT context
    return this.statsService.getStudentStats(user, user.facultyId);
  }
}
