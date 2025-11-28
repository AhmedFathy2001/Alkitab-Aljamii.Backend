import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ContentController } from './controllers/contents.controller.js';
import { ContentStreamController } from './controllers/content-stream.controller.js';
import { ContentService } from './services/content.service.js';
import { PdfWatermarkService } from './services/pdf-watermark.service.js';
import { PdfPagesService } from './services/pdf-pages.service.js';
import { ContentAccessService } from './services/content-access.service.js';
import { PermissionService } from '../common/services/permission.service.js';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [ContentController, ContentStreamController],
  providers: [
    ContentService,
    PdfWatermarkService,
    PdfPagesService,
    ContentAccessService,
    PermissionService,
  ],
  exports: [PdfWatermarkService, PdfPagesService, ContentAccessService],
})
export class ContentModule {}
