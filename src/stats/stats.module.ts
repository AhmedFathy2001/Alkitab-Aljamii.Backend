import { Module } from '@nestjs/common';
import { StatsController } from './controllers/stats.controller.js';
import { StatsService } from './services/stats.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
