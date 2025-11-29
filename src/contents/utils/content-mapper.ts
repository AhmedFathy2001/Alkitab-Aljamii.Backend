import { ContentType } from '@prisma/client/index-browser';

import { ContentResponseDto } from '../dto/content-response.dto.js';

export interface ContentWithRelations {
  id: string;
  title: string;
  titleAr: string;
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
  subject: { name: string };
  uploadedBy: { firstName: string; lastName: string };
}

export function mapToContentResponse(
  content: ContentWithRelations,
): ContentResponseDto {
  const dto = new ContentResponseDto(); // constructor فارغ

  dto.id = content.id;
  dto.title = content.title;
  dto.titleAr = content.titleAr;
  dto.description = content.description ?? '';
  dto.descriptionAr = content.descriptionAr ?? '';
  dto.filePath = content.filePath;
  dto.fileName = content.fileName;
  dto.mimeType = content.mimeType;
  dto.contentType = content.contentType;
  dto.fileSize = Number(content.fileSize);
  dto.status = content.status as 'pending' | 'approved' | 'rejected';
  dto.approvedById = content.approvedById;
  dto.subjectId = content.subjectId;
  dto.subjectName = content.subject.name;
  dto.uploadedById = content.uploadedById;
  dto.uploadedByName = `${content.uploadedBy.firstName} ${content.uploadedBy.lastName}`;
  dto.createdAt = content.createdAt;
  dto.updatedAt = content.updatedAt;

  return dto;
}
