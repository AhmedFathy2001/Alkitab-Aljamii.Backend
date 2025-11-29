export class ContentResponseDto {
  id!: string;

  title!: string;
  titleAr!: string;

  description!: string;
  descriptionAr!: string;

  filePath!: string;
  fileName!: string;
  mimeType!: string;
  contentType!: string;
  fileSize!: number;
  status!: 'pending' | 'approved' | 'rejected';
  approvedById!: string | null;
  subjectId!: string;
  subjectName!: string;
  subjectNameAr!: string;
  uploadedById!: string;
  uploadedByName!: string;
  createdAt!: Date;
  updatedAt!: Date;

  /**
   * Return localized title
   * @param lang 'en' | 'ar'
   */
  getTitle(lang: 'en' | 'ar') {
    return lang === 'ar' ? this.titleAr : this.title;
  }

  /**
   * Return localized description
   * @param lang 'en' | 'ar'
   */
  getDescription(lang: 'en' | 'ar') {
    return lang === 'ar' ? this.descriptionAr : this.description;
  }
}

export class PaginatedContentResponseDto {
  data!: ContentResponseDto[];
  total!: number;
}
