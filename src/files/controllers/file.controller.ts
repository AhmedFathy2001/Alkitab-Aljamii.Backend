import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Res,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  HttpCode,
  HttpStatus,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { Readable } from 'stream';
import { FileService } from '../services/file.service.js';
import { PermissionService } from '../../common/services/permission.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const normalizeKey = (key: string | string[]): string =>
  Array.isArray(key) ? key.join('/') : key;

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly permissionService: PermissionService,
  ) {}

  @Post('upload')
  @Roles('super_admin', 'faculty_admin', 'professor')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file (for testing)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        path: { type: 'string', description: 'Storage path prefix' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
      }),
    )
    file: Express.Multer.File,
    @Query('path') path?: string,
  ) {
    const result = await this.fileService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      path ?? 'uploads',
    );
    return { message: 'File uploaded successfully', data: result };
  }

  @Get('download/content/:contentId')
  @ApiOperation({ summary: 'Download file by content ID (checks permission)' })
  @ApiParam({ name: 'contentId', description: 'Content UUID' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async downloadByContent(
    @Param('contentId') contentId: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    await this.permissionService.assertCanAccessContent(user.sub, contentId);
    const filePath = await this.fileService.getContentFilePath(contentId);
    const { stream, metadata } = await this.fileService.downloadFile(filePath);

    // Log access
    await this.fileService.logContentAccess(
      contentId,
      user.sub,
      'download',
      req.ip,
      req.get('user-agent'),
    );

    res.set({
      'Content-Type': metadata.mimeType,
      'Content-Length': metadata.size.toString(),
      'Content-Disposition': `inline; filename="${filePath.split('/').pop()}"`,
    });

    return new StreamableFile(Readable.from(stream));
  }

  @Get('metadata/content/:contentId')
  @ApiOperation({ summary: 'Get file metadata by content ID' })
  @ApiParam({ name: 'contentId', description: 'Content UUID' })
  async getContentMetadata(
    @Param('contentId') contentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.permissionService.assertCanAccessContent(user.sub, contentId);
    const filePath = await this.fileService.getContentFilePath(contentId);
    const metadata = await this.fileService.getFileMetadata(filePath);
    return { data: metadata };
  }

  @Get('signed-url/content/:contentId')
  @ApiOperation({ summary: 'Get signed URL by content ID' })
  @ApiParam({ name: 'contentId', description: 'Content UUID' })
  @ApiQuery({ name: 'expiresIn', required: false })
  async getContentSignedUrl(
    @Param('contentId') contentId: string,
    @CurrentUser() user: JwtPayload,
    @Query('expiresIn') expiresIn?: string,
  ) {
    await this.permissionService.assertCanAccessContent(user.sub, contentId);
    const filePath = await this.fileService.getContentFilePath(contentId);
    const expiry = expiresIn ? parseInt(expiresIn, 10) : 3600;
    const url = await this.fileService.getSignedUrl(filePath, expiry);
    return { data: { url, expiresIn: expiry } };
  }

  // Admin-only direct key access (for debugging/management)
  @Get('admin/download/*key')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Admin: Download by direct key' })
  async adminDownload(
    @Param('key') key: string | string[],
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const fileKey = normalizeKey(key);
    const { stream, metadata } = await this.fileService.downloadFile(fileKey);

    res.set({
      'Content-Type': metadata.mimeType,
      'Content-Length': metadata.size.toString(),
      'Content-Disposition': `attachment; filename="${fileKey.split('/').pop()}"`,
    });

    return new StreamableFile(Readable.from(stream));
  }

  @Delete('admin/*key')
  @Roles('super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin: Delete file by key' })
  async adminDelete(@Param('key') key: string | string[]): Promise<void> {
    await this.fileService.deleteFile(normalizeKey(key));
  }
}
