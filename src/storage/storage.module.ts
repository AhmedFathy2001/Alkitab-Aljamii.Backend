import { Module, Global } from '@nestjs/common';
import { MinioStorageService } from './minio.service.js';
import { STORAGE_SERVICE } from './storage.interface.js';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      useClass: MinioStorageService,
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
