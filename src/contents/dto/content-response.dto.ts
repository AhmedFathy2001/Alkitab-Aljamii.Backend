export class ContentResponseDto {
  id!: string;
  title!: string;
  description!: string;
  filePath!: string;
  fileName!: string;
  mimeType!: string;
  contentType!: string;
  fileSize!: number;
  status!: 'pending' | 'approved' | 'rejected';
  approvedById!: string | null;
  subjectId!: string;
  subjectName!: string;
  uploadedById!: string;
  uploadedByName!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedContentResponseDto {
  data!: ContentResponseDto[];
  total!: number;
}
