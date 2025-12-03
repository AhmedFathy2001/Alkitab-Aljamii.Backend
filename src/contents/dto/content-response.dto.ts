import { ApiProperty } from '@nestjs/swagger';

export class ContentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  titleAr!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  descriptionAr!: string;

  @ApiProperty()
  filePath!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  fileSize!: number;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
  status!: 'pending' | 'approved' | 'rejected';

  @ApiProperty({ nullable: true })
  approvedById!: string | null;

  @ApiProperty()
  subjectId!: string;

  @ApiProperty()
  subjectName!: string;

  @ApiProperty()
  subjectNameAr!: string;

  @ApiProperty()
  uploadedById!: string;

  @ApiProperty()
  uploadedByName!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginatedContentResponseDto {
  @ApiProperty({ type: [ContentResponseDto] })
  data!: ContentResponseDto[];

  @ApiProperty()
  total!: number;
}
