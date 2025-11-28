import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import type { MinioConfig } from '../config/configuration.js';
import type {
  IStorageService,
  UploadResult,
  FileMetadata,
} from './storage.interface.js';

@Injectable()
export class MinioStorageService implements IStorageService, OnModuleInit {
  private readonly logger = new Logger(MinioStorageService.name);
  private client: Minio.Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<MinioConfig>('minio');
    if (!config) {
      throw new Error('MinIO configuration not found');
    }

    this.client = new Minio.Client({
      endPoint: config.endpoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    this.bucketName = config.bucketName;
  }

  async onModuleInit(): Promise<void> {
    try {
      const bucketExists = await this.client.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.client.makeBucket(this.bucketName);
        this.logger.log(`Created bucket: ${this.bucketName}`);
      } else {
        this.logger.log(`Bucket ${this.bucketName} already exists`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to initialize MinIO bucket: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    path: string,
  ): Promise<UploadResult> {
    const fileExtension = fileName.split('.').pop() ?? '';
    const fileKey = `${path}/${uuidv4()}.${fileExtension}`;

    await this.client.putObject(
      this.bucketName,
      fileKey,
      buffer,
      buffer.length,
      {
        'Content-Type': mimeType,
      },
    );

    return {
      key: fileKey,
      bucket: this.bucketName,
      size: buffer.length,
      mimeType,
    };
  }

  async getFileStream(key: string): Promise<NodeJS.ReadableStream> {
    return this.client.getObject(this.bucketName, key);
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucketName, key);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.removeObject(this.bucketName, key);
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucketName, key, expiresIn);
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, key);
      return true;
    } catch {
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<FileMetadata> {
    const stat = await this.client.statObject(this.bucketName, key);
    const metaData = stat.metaData as Record<string, string> | undefined;
    return {
      key,
      size: stat.size,
      mimeType: metaData?.['content-type'] ?? 'application/octet-stream',
      lastModified: stat.lastModified,
    };
  }
}
