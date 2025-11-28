import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileService } from './services/file.service.js';
import { FileController } from './controllers/file.controller.js';
import { PermissionService } from '../common/services/permission.service.js';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [FileController],
  providers: [FileService, PermissionService],
  exports: [FileService],
})
export class FilesModule {}
