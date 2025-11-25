export class ContentResponseDto {
    id!: string;
    title!: string;
    description!: string; 
    filePath!: string;
    fileName!: string;
    mimeType!: string;
    contentType!: string; 
    fileSize!: bigint;
    status!: 'pending' | 'approved' | 'rejected';
    approvedById?: string;
    createdAt!: Date;
    updatedAt!: Date;
}

export class PaginatedContentResponseDto {
    data!: ContentResponseDto[];
    total!: number;
}