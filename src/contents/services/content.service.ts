import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { STORAGE_SERVICE } from '../../storage/storage.interface.js';
import type { IStorageService } from '../../storage/storage.interface.js';
import { PdfPagesService } from './pdf-pages.service.js';
import { PdfValidationService } from './pdf-validation.service.js';
import { CreateContentDto } from '../dto/create-content.dto.js';
import {
  ContentResponseDto,
  PaginatedContentResponseDto,
} from '../dto/content-response.dto.js';
import { ContentType } from '@prisma/client/index-browser';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import {
  mapToContentResponse,
  ContentWithRelations,
} from '../utils/content-mapper.js';
import { I18nService } from 'nestjs-i18n';
import { PaginationService } from '../../common/services/pagination.service.js';
import { PaginationQueryDto } from '@/common/index.js';

type UploadedFileType = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type ContentFileInfo = {
  filePath: string;
  fileName: string;
  mimeType: string;
};

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  private readonly storage: IStorageService;

  constructor(
    private readonly prisma: PrismaService,
    private paginationService: PaginationService,
    @Inject(STORAGE_SERVICE) storageService: IStorageService,
    private readonly pdfPagesService: PdfPagesService,
    private readonly pdfValidationService: PdfValidationService,
    private readonly i18n: I18nService,
  ) {
    this.storage = storageService;
  }

  async uploadContent(
    file: UploadedFileType,
    dto: CreateContentDto,
    uploadedById: string,
  ): Promise<ContentResponseDto> {
    // Validate PDF before uploading (throws BadRequestException if invalid)
    const pageCount = await this.pdfValidationService.assertValidPdf(
      file.buffer,
      file.mimetype,
    );

    const uploadResult = await this.storage.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      `contents/${dto.subjectId}`,
    );

    const content = await this.prisma.content.create({
      data: {
        title: dto.title,
        titleAr: dto.titleAr ?? null,
        description: dto.description ?? '',
        descriptionAr: dto.descriptionAr ?? null,
        filePath: uploadResult.key,
        fileName: file.originalname,
        mimeType: file.mimetype,
        contentType: dto.contentType as ContentType,
        fileSize: BigInt(file.size),
        pageCount: pageCount > 0 ? pageCount : null,
        status: 'pending',
        uploadedById,
        subjectId: dto.subjectId,
      },
      include: {
        subject: { select: { name: true, nameAr: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return mapToContentResponse(content as ContentWithRelations);
  }

  async getAllContents(
    user: JwtPayload,
    subjectId?: string,
    status?: string,
  ): Promise<PaginatedContentResponseDto> {
    const userId = user.sub;
    const effectiveRole = user.activeView;
    const facultyId = user.facultyId;
    const isAdmin = user.isSuperAdmin || effectiveRole === 'faculty_admin';

    const where: Record<string, unknown> = {};

    if (subjectId) where['subjectId'] = subjectId;
    if (facultyId) where['subject'] = { facultyId };
    if (status && isAdmin) where['status'] = status;

    if (!isAdmin) {
      where['OR'] = [{ status: 'approved' }, { uploadedById: userId }];
    }

    if (effectiveRole === 'student' || effectiveRole === 'professor') {
      const assignments = await this.prisma.userSubjectAssignment.findMany({
        where: { userId },
        select: { subjectId: true },
      });
      const enrolledSubjectIds = assignments.map(
        (a: { subjectId: string }) => a.subjectId,
      );

      if (subjectId) {
        if (!enrolledSubjectIds.includes(subjectId))
          return { data: [], total: 0 };
      } else {
        where['subjectId'] = { in: enrolledSubjectIds };
      }
    }

    const contents = await this.prisma.content.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        subject: { select: { name: true, nameAr: true, facultyId: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return { data: contents.map(mapToContentResponse), total: contents.length };
  }

  async getContentById(id: string): Promise<ContentResponseDto> {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        subject: { select: { name: true, nameAr: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!content)
      throw new NotFoundException(
        await this.i18n.translate('content.CONTENT_NOT_FOUND'),
      );

    return mapToContentResponse(content);
  }

  async approveContent(
    id: string,
    approvedById: string,
  ): Promise<ContentResponseDto> {
    const content = await this.prisma.content.update({
      where: { id },
      data: { status: 'approved', approvedById, approvedAt: new Date() },
      include: {
        subject: { select: { name: true, nameAr: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });

    await this.prisma.contentApproval.create({
      data: { contentId: id, reviewedBy: approvedById, action: 'approved' },
    });

    return mapToContentResponse(content);
  }

  async rejectContent(
    id: string,
    rejectedById: string,
    reason?: string,
  ): Promise<ContentResponseDto> {
    const content = await this.prisma.content.update({
      where: { id },
      data: { status: 'rejected', rejectionReason: reason ?? null },
      include: {
        subject: { select: { name: true, nameAr: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });

    await this.prisma.contentApproval.create({
      data: {
        contentId: id,
        reviewedBy: rejectedById,
        action: 'rejected',
        notes: reason ?? null,
      },
    });

    return mapToContentResponse(content);
  }

  async deleteContent(id: string): Promise<void> {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content)
      throw new NotFoundException(
        await this.i18n.translate('content.CONTENT_NOT_FOUND'),
      );
    await this.storage.deleteFile(content.filePath);
    await this.prisma.content.delete({ where: { id } });
  }

  private async getContentFileInfo(id: string): Promise<ContentFileInfo> {
    const content = await this.prisma.content.findUnique({
      where: { id },
      select: { filePath: true, fileName: true, mimeType: true },
    });
    if (!content)
      throw new NotFoundException(
        await this.i18n.translate('content.CONTENT_NOT_FOUND'),
      );
    return content as ContentFileInfo;
  }

  async getFileStream(id: string): Promise<{
    stream: NodeJS.ReadableStream;
    fileName: string;
    mimeType: string;
  }> {
    const content = await this.getContentFileInfo(id);
    const stream: NodeJS.ReadableStream = await this.storage.getFileStream(
      content.filePath,
    );
    return { stream, fileName: content.fileName, mimeType: content.mimeType };
  }

  async getFileBuffer(
    id: string,
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const content = await this.getContentFileInfo(id);
    const buffer: Buffer = await this.storage.getFileBuffer(content.filePath);
    return { buffer, fileName: content.fileName, mimeType: content.mimeType };
  }

  async getPageCount(
    id: string,
  ): Promise<{ totalPages: number; chunkSize: number }> {
    const content = await this.prisma.content.findUnique({
      where: { id },
      select: { id: true, pageCount: true, mimeType: true, filePath: true },
    });

    if (!content)
      throw new NotFoundException(
        await this.i18n.translate('content.CONTENT_NOT_FOUND'),
      );
    if (content.mimeType !== 'application/pdf') {
      throw new NotFoundException(
        await this.i18n.translate('content.PAGE_COUNT_ONLY_PDF'),
      );
    }

    if (content.pageCount !== null) {
      return {
        totalPages: content.pageCount,
        chunkSize: this.pdfPagesService.defaultChunkSize,
      };
    }

    this.logger.log(
      await this.i18n.translate('content.LOG_CALCULATING_PAGE_COUNT', {
        args: { id },
      }),
    );
    const buffer: Buffer = await this.storage.getFileBuffer(content.filePath);
    const pageCount = await this.pdfPagesService.getPageCount(buffer);

    this.prisma.content
      .update({ where: { id }, data: { pageCount } })
      .then(async () =>
        this.logger.log(
          await this.i18n.translate('content.LOG_STORED_PAGE_COUNT', {
            args: { pageCount, id },
          }),
        ),
      )
      .catch(async (err: any) =>
        this.logger.warn(
          await this.i18n.translate('content.LOG_FAILED_STORE_PAGE_COUNT', {
            args: { id, error: String(err) },
          }),
        ),
      );

    return {
      totalPages: pageCount,
      chunkSize: this.pdfPagesService.defaultChunkSize,
    };
  }
  async filterAndPaginateForSuperAdmin(query: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    subjectId?: string;
    uploaderId?: string;
    search?: string;
  }) {
    // Default values to avoid undefined errors
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
  
    const skip = (page - 1) * limit;
  
    const where: any = {};
  
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.uploaderId) where.uploadedById = query.uploaderId;
  
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
  
    const [data, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        include: {
          subject: true,
          uploadedBy: true,
        },
        skip,
        take: limit, // now always a number
        orderBy: { [sortBy]: sortOrder }, // safe computed key
      }),
  
      this.prisma.content.count({ where }),
    ]);
  
    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
  async getContentsForUsers(
    query: PaginationQueryDto,
    extraWhere: any = {},
  ) {
    return this.paginationService.paginate(
      (args) =>
        this.prisma.content.findMany({
          ...args,
          where: { ...args.where, ...extraWhere },
          include: {
            subject: true,
            uploadedBy: true, // مهم للـ mapToContentResponse
          },
        }),
      (args) =>
        this.prisma.content.count({
          ...args,
          where: { ...args.where, ...extraWhere },
        }),
      query,
      extraWhere,
      ['title', 'description'], // searchable fields
    );
  }
  

}
