import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateContentDto } from '../dto/create-content.dto';
import { ContentResponseDto, PaginatedContentResponseDto } from '../dto/content-response.dto';

type UploadedFileType = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async uploadContent(
    file: UploadedFileType,
    dto: CreateContentDto,
    currentUser: { id: string; subjectId: string } // لازم تضيف subjectId هنا
  ): Promise<ContentResponseDto> {
    const filePath = `uploads/${file.originalname}`;

    const content = await this.prisma.content.create({
      data: {
        title: dto.title,
        description: dto.description ?? '',
        filePath,
        fileName: file.originalname,
        mimeType: file.mimetype,
        contentType: dto.contentType as any, // لو enum
        fileSize: BigInt(file.size),
        status: 'pending',
        uploadedById: currentUser.id,
        subjectId: currentUser.subjectId, // ضروري حسب Prisma model
      },
    });

    return this.mapToContentResponseDto(content);
  }

  async getAllContents(): Promise<PaginatedContentResponseDto> {
    const contents = await this.prisma.content.findMany();
    return {
      data: contents.map(c => this.mapToContentResponseDto(c)),
      total: contents.length,
    };
  }

  async getContentById(id: string): Promise<ContentResponseDto> {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Content not found');
    return this.mapToContentResponseDto(content);
  }

  async approveContent(id: string): Promise<ContentResponseDto> {
    const content = await this.prisma.content.update({
      where: { id },
      data: { status: 'approved' },
    });
    return this.mapToContentResponseDto(content);
  }

  async rejectContent(id: string): Promise<ContentResponseDto> {
    const content = await this.prisma.content.update({
      where: { id },
      data: { status: 'rejected' },
    });
    return this.mapToContentResponseDto(content);
  }

  async streamContent(id: string) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Content not found');
    return { filePath: content.filePath, fileName: content.fileName, mimeType: content.mimeType };
  }

  async deleteContent(id: string) {
    await this.prisma.content.delete({ where: { id } });
  }

  private mapToContentResponseDto(content: any): ContentResponseDto {
    return {
      id: content.id,
      title: content.title,
      description: content.description ?? '',
      filePath: content.filePath,
      fileName: content.fileName,
      mimeType: content.mimeType,
      contentType: content.contentType,
      fileSize: content.fileSize,
      status: content.status,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      approvedById: content.approvedById ?? null,
      // حذفت createdById لأنها مش موجودة في DTO
    };
  }
}
