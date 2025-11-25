import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContentController } from './controllers/contents.controller';
import { ContentService } from './services/content.service';

@Module({
    imports: [PrismaModule],
    controllers: [ContentController],
    providers: [ContentService],
})
export class ContentModule {}