import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ContentService } from '../services/content.service.js';
import { PermissionService } from '../../common/services/permission.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type JwtPayload,
} from '../../common/decorators/current-user.decorator.js';
import {
  ContentResponseDto,
  PaginatedContentResponseDto,
} from '../dto/content-response.dto.js';
import { CreateContentDto } from '../dto/create-content.dto.js';
import { PaginationQueryDto } from '@/common/index.js';


type UploadedFileType = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@ApiTags('Contents')
@ApiBearerAuth()
@Controller('contents')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly permissionService: PermissionService,
  ) {}

  @Post('upload')
  @Roles('super_admin', 'faculty_admin', 'professor')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload content to a subject' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        titleAr: { type: 'string' },
        description: { type: 'string' },
        descriptionAr: { type: 'string' },
        subjectId: { type: 'string', format: 'uuid' },
        contentType: {
          type: 'string',
          enum: ['textbook', 'reference', 'notes', 'guide', 'other'],
        },
      },
      required: ['file', 'titleEn', 'subjectId', 'contentType'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Content uploaded',
    type: ContentResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No permission to upload to this subject',
  })
  async upload(
    @UploadedFile() file: UploadedFileType,
    @Body() dto: CreateContentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ContentResponseDto> {
    await this.permissionService.assertCanUploadToSubject(
      user.sub,
      dto.subjectId,
    );
    return this.contentService.uploadContent(file, dto, user.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'List contents (filtered by access and JWT context)',
  })
  @ApiResponse({ status: 200, type: PaginatedContentResponseDto })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('subjectId') subjectId?: string,
    @Query('status') status?: string,
  ): Promise<PaginatedContentResponseDto> {
    return this.contentService.getAllContents(user, subjectId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content by ID' })
  @ApiParam({ name: 'id', description: 'Content UUID' })
  @ApiResponse({ status: 200, type: ContentResponseDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ContentResponseDto> {
    await this.permissionService.assertCanAccessContent(user.sub, id);
    return this.contentService.getContentById(id);
  }

  @Put(':id/approve')
  @Roles('super_admin', 'faculty_admin')
  @ApiOperation({ summary: 'Approve content' })
  @ApiParam({ name: 'id', description: 'Content UUID' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ContentResponseDto> {
    return this.contentService.approveContent(id, user.sub);
  }

  @Put(':id/reject')
  @Roles('super_admin', 'faculty_admin')
  @ApiOperation({ summary: 'Reject content' })
  @ApiParam({ name: 'id', description: 'Content UUID' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ContentResponseDto> {
    return this.contentService.rejectContent(id, user.sub, reason);
  }

  @Delete(':id')
  @Roles('super_admin', 'faculty_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete content' })
  @ApiParam({ name: 'id', description: 'Content UUID' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.contentService.deleteContent(id);
  }
  @Get('admin-all')
@Roles('super_admin')
async getAllContentForSuperAdmin(
  @Query('page') page?: number,
  @Query('limit') limit?: number,
  @Query('sortBy') sortBy?: string,
  @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  @Query('subjectId') subjectId?: string,
  @Query('uploaderId') uploaderId?: string,
  @Query('search') search?: string,
) {
  const query: any = {
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 10,
    sortBy: sortBy ?? 'createdAt',
    sortOrder: sortOrder ?? 'desc',
  };

  if (subjectId) query.subjectId = subjectId;
  if (uploaderId) query.uploaderId = uploaderId;
  if (search) query.search = search;

  return this.contentService.filterAndPaginateForSuperAdmin(query);
}
@Get()
async getContents(
  @Query() query: PaginationQueryDto,
  @Query('subjectId') subjectId?: string,
  @Query('status') status?: string,
): Promise<PaginatedContentResponseDto> {
  const extraWhere: Record<string, any> = {};

  if (subjectId) extraWhere['subjectId'] = subjectId;
  if (status) extraWhere['status'] = status;

  if (query.search) {
    extraWhere['OR'] = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const result = await this.contentService.getContentsForUsers(query, extraWhere);

  const mappedItems: ContentResponseDto[] = result.items.map((item) => ({
    id: item.id,
    title: item.title,
    titleAr: item.titleAr ?? null,
    description: item.description,
    descriptionAr: item.descriptionAr ?? null,
    contentType: item.contentType,
    status: item.status,
    subjectId: item.subjectId,
    uploadedById: item.uploadedById,
    filePath: item.filePath,
    fileName: item.fileName,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  return {
    data: mappedItems,
    total: result.meta.total,
  };
}

}

