import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import type {
  IStorageService,
  FileMetadata,
  UploadResult,
} from '../../storage/storage.interface.js';
import { STORAGE_SERVICE } from '../../storage/storage.interface.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface FileDownloadResult {
  stream: NodeJS.ReadableStream;
  metadata: FileMetadata;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    path: string = 'uploads',
  ): Promise<UploadResult> {
    this.logger.log(`Uploading file: ${fileName} to path: ${path}`);
    return this.storageService.uploadFile(buffer, fileName, mimeType, path);
  }

  async downloadFile(key: string): Promise<FileDownloadResult> {
    const exists = await this.storageService.fileExists(key);
    if (!exists) {
      throw new NotFoundException(`File not found: ${key}`);
    }

    const [stream, metadata] = await Promise.all([
      this.storageService.getFileStream(key),
      this.storageService.getFileMetadata(key),
    ]);

    this.logger.log(`Streaming file: ${key}, size: ${metadata.size} bytes`);

    return { stream, metadata };
  }

  async getFileMetadata(key: string): Promise<FileMetadata> {
    const exists = await this.storageService.fileExists(key);
    if (!exists) {
      throw new NotFoundException(`File not found: ${key}`);
    }
    return this.storageService.getFileMetadata(key);
  }

  async deleteFile(key: string): Promise<void> {
    const exists = await this.storageService.fileExists(key);
    if (!exists) {
      throw new NotFoundException(`File not found: ${key}`);
    }
    await this.storageService.deleteFile(key);
    this.logger.log(`Deleted file: ${key}`);
  }

  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    const exists = await this.storageService.fileExists(key);
    if (!exists) {
      throw new NotFoundException(`File not found: ${key}`);
    }
    return this.storageService.getSignedUrl(key, expiresIn);
  }

  async getContentFilePath(contentId: string): Promise<string> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { filePath: true },
    });
    if (!content) {
      throw new NotFoundException(`Content not found: ${contentId}`);
    }
    return content.filePath;
  }

  async logContentAccess(
    contentId: string,
    userId: string,
    action: 'view' | 'stream' | 'download',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.contentAccessLog.create({
      data: {
        contentId,
        accessedById: userId,
        action,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
    this.logger.log(
      `Access logged: ${action} on content ${contentId} by user ${userId}`,
    );
  }
}
