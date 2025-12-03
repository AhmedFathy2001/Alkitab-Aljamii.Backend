import { ContentType } from '@prisma/client/index-browser';

import { ContentResponseDto } from '../dto/content-response.dto.js';

export interface ContentWithRelations {
  id: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  filePath: string;
  fileName: string;
  mimeType: string;
  contentType: ContentType;
  fileSize: bigint;
  status: string;
  approvedById: string | null;
  subjectId: string;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
  subject: { name: string; nameAr: string | null };
  uploadedBy: { firstName: string; lastName: string };
}

export function mapToContentResponse(
  content: ContentWithRelations,
): ContentResponseDto {
  return {
    id: content.id,
    title: content.title,
    titleAr: content.titleAr ?? '',
    description: content.description ?? '',
    descriptionAr: content.descriptionAr ?? '',
    filePath: content.filePath,
    fileName: content.fileName,
    mimeType: content.mimeType,
    contentType: content.contentType,
    fileSize: Number(content.fileSize),
    status: content.status as 'pending' | 'approved' | 'rejected',
    approvedById: content.approvedById,
    subjectId: content.subjectId,
    subjectName: content.subject.name,
    subjectNameAr: content.subject.nameAr ?? '',
    uploadedById: content.uploadedById,
    uploadedByName: `${content.uploadedBy.firstName} ${content.uploadedBy.lastName}`,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
  };
}
