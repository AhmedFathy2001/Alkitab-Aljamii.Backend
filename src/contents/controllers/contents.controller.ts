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
    Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ContentService } from '../services/content.service';
import { Roles } from '@/common';
import { ContentResponseDto, PaginatedContentResponseDto } from '../dto/content-response.dto';
import { CreateContentDto } from '../dto/create-content.dto';
import type { Request } from 'express';
import { UserRole } from '@prisma/client/index-browser';
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
    constructor(private readonly contentService: ContentService) {}

    @Post('upload')
    @Roles(UserRole.super_admin, UserRole.faculty_admin)
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Upload a new content file' })
    @ApiResponse({ status: 201, description: 'Content uploaded successfully', type: ContentResponseDto })
    async upload(
        @UploadedFile() file: UploadedFileType,
        @Body() dto: CreateContentDto,
        @Req() req: Request,
    ) {
        const currentUser = req.user as any;
        return this.contentService.uploadContent(file, dto, currentUser);
    }
    @Get()
    @ApiOperation({ summary: 'List all contents' })
    @ApiResponse({ status: 200, description: 'Contents list', type: [ContentResponseDto] })
    async findAll(): Promise<PaginatedContentResponseDto> {
        return this.contentService.getAllContents();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get content by ID' })
    @ApiParam({ name: 'id', description: 'Content ID' })
    @ApiResponse({ status: 200, description: 'Content found', type: ContentResponseDto })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ContentResponseDto> {
        return this.contentService.getContentById(id);
    }

    @Put(':id/approve')
    @Roles(UserRole.super_admin, UserRole.faculty_admin)
    @ApiOperation({ summary: 'Approve a content' })
    async approve(@Param('id', ParseUUIDPipe) id: string): Promise<ContentResponseDto> {
        return this.contentService.approveContent(id);
    }

    @Put(':id/reject')
    @Roles(UserRole.super_admin, UserRole.faculty_admin)
    @ApiOperation({ summary: 'Reject a content' })
    async reject(@Param('id', ParseUUIDPipe) id: string): Promise<ContentResponseDto> {
        return this.contentService.rejectContent(id);
    }

    @Get(':id/stream')
    @Roles(UserRole.super_admin, UserRole.faculty_admin)
    @ApiOperation({ summary: 'Stream a content file' })
    async stream(@Param('id', ParseUUIDPipe) id: string) {
        return this.contentService.streamContent(id);
    }
    @Delete(':id')
    @Roles(UserRole.super_admin, UserRole.faculty_admin)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a content' })
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.contentService.deleteContent(id);
    }
}
