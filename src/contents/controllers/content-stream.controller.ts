import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  StreamableFile,
  NotFoundException,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Readable } from 'stream';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ContentService } from '../services/content.service.js';
import { PdfWatermarkService } from '../services/pdf-watermark.service.js';
import { PdfPagesService } from '../services/pdf-pages.service.js';
import { ContentAccessService } from '../services/content-access.service.js';
import { PermissionService } from '../../common/services/permission.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CurrentUser,
  type JwtPayload,
} from '../../common/decorators/current-user.decorator.js';
import { I18nService } from 'nestjs-i18n';

@ApiTags('Content Streaming')
@ApiBearerAuth()
@Controller('contents/:id')
export class ContentStreamController {
  private readonly logger = new Logger(ContentStreamController.name);

  constructor(
    private readonly contentService: ContentService,
    private readonly permissionService: PermissionService,
    private readonly pdfWatermarkService: PdfWatermarkService,
    private readonly pdfPagesService: PdfPagesService,
    private readonly contentAccessService: ContentAccessService,
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService, // إضافة i18n
  ) {}

  @Get('stream')
  @ApiOperation({ summary: 'Stream/download content file' })
  @ApiParam({ name: 'id', description: 'Content UUID' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 403, description: 'Access denied or quota exceeded' })
  async stream(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log(`Stream request for content ${id} by user ${user.sub}`);
    await this.permissionService.assertCanAccessContent(user.sub, id);

    if (!user.isSuperAdmin && user.activeView !== 'faculty_admin') {
      await this.contentAccessService.assertWithinQuota(user.sub, id);
    }

    try {
      const { buffer, fileName, mimeType } =
        await this.contentService.getFileBuffer(id);
      let finalBuffer = buffer;

      if (this.pdfWatermarkService.isPdf(mimeType)) {
        const userDetails = await this.prisma.user.findUnique({
          where: { id: user.sub },
          select: { firstName: true, lastName: true, email: true },
        });

        if (userDetails) {
          finalBuffer = await this.pdfWatermarkService.applyWatermark(buffer, {
            userEmail: userDetails.email,
            userName: `${userDetails.firstName} ${userDetails.lastName}`,
            userId: user.sub,
          });
        }
      }

      const ipAddress = req.ip ?? req.headers['x-forwarded-for']?.toString();
      const userAgent = req.headers['user-agent'];
      this.contentAccessService
        .logAccess({
          contentId: id,
          userId: user.sub,
          action: 'stream',
          ipAddress,
          userAgent,
        })
        .catch((err) => this.logger.error('Failed to log access:', err));

      res.set({
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        Pragma: 'no-cache',
        Expires: '0',
      });

      return new StreamableFile(Readable.from(finalBuffer));
    } catch (error) {
      this.logger.error(`Failed to stream content ${id}:`, error);
      throw new NotFoundException(
        await this.i18n.translate('content.FILE_NOT_FOUND'),
      );
    }
  }

  @Get('pages')
  @ApiOperation({ summary: 'Get PDF pages in chunks (paginated streaming)' })
  @ApiParam({ name: 'id', description: 'Content UUID' })
  @ApiResponse({ status: 200, description: 'PDF chunk with requested pages' })
  @ApiResponse({ status: 403, description: 'Access denied or quota exceeded' })
  async getPages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('start') startParam: string,
    @Query('count') countParam: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const start = parseInt(startParam, 10) || 0;
    const count =
      parseInt(countParam, 10) || this.pdfPagesService.defaultChunkSize;

    await this.permissionService.assertCanAccessContent(user.sub, id);

    if (
      start === 0 &&
      !user.isSuperAdmin &&
      user.activeView !== 'faculty_admin'
    ) {
      await this.contentAccessService.assertWithinQuota(user.sub, id);
    }

    try {
      const { buffer, mimeType } = await this.contentService.getFileBuffer(id);

      if (!this.pdfWatermarkService.isPdf(mimeType)) {
        throw new NotFoundException(
          await this.i18n.translate('content.PAGINATED_ONLY_FOR_PDF'),
        );
      }

      const userDetails = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { firstName: true, lastName: true, email: true },
      });

      const result = await this.pdfPagesService.extractPages(buffer, {
        startPage: start,
        pageCount: count,
        watermark: userDetails
          ? {
              userName: `${userDetails.firstName} ${userDetails.lastName}`,
              userEmail: userDetails.email,
            }
          : undefined,
      });

      if (start === 0) {
        const ipAddress = req.ip ?? req.headers['x-forwarded-for']?.toString();
        const userAgent = req.headers['user-agent'];
        this.contentAccessService
          .logAccess({
            contentId: id,
            userId: user.sub,
            action: 'view',
            ipAddress,
            userAgent,
          })
          .catch((err) => this.logger.error('Failed to log access:', err));
      }

      res.set({
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        Pragma: 'no-cache',
        Expires: '0',
        'X-Total-Pages': result.totalPages.toString(),
        'X-Start-Page': result.startPage.toString(),
        'X-End-Page': result.endPage.toString(),
        'X-Has-More': result.hasMore.toString(),
      });

      return new StreamableFile(Readable.from(result.pdfBuffer));
    } catch (error) {
      this.logger.error(`Failed to get pages for content ${id}:`, error);
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException(
        await this.i18n.translate('content.FILE_NOT_FOUND'),
      );
    }
  }

  @Get('page-count')
  @ApiOperation({ summary: 'Get total page count for a PDF' })
  @ApiParam({ name: 'id', description: 'Content UUID' })
  @ApiResponse({ status: 200, description: 'Page count' })
  async getPageCount(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ totalPages: number; chunkSize: number }> {
    await this.permissionService.assertCanAccessContent(user.sub, id);
    return this.contentService.getPageCount(id);
  }
}
