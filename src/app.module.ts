
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { FacultiesModule } from './faculties/faculties.module.js';
import { FilesModule } from './files/files.module.js';
import { I18nConfigModule } from './i18n/i18n.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { ContentModule } from './contents/content.module.js';
import { StorageModule } from './storage/storage.module.js';
import { SubjectsModule } from './subjects/subjects.module.js';
import { StatsModule } from './stats/stats.module.js';
import { LocalizationInterceptor } from './common/interceptors/localization.interceptor.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    I18nConfigModule,
    AuthModule,
    UsersModule,
    FacultiesModule,
    SubjectsModule,
    ContentModule,
    FilesModule,
    StorageModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LocalizationInterceptor, // Runs last to process wrapped response
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],  
})
export class AppModule {}
