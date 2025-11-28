export class UpdateContentDto {
  title?: string;
  description?: string;
  status?: 'pending' | 'approved' | 'rejected';
}
