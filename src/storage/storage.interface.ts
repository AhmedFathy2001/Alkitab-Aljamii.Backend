export interface UploadResult {
  key: string;
  bucket: string;
  size: number;
  mimeType: string;
}

export interface FileMetadata {
  key: string;
  size: number;
  mimeType: string;
  lastModified: Date;
}

export interface IStorageService {
  uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    path: string,
  ): Promise<UploadResult>;

  getFileStream(key: string): Promise<NodeJS.ReadableStream>;

  getFileBuffer(key: string): Promise<Buffer>;

  deleteFile(key: string): Promise<void>;

  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  fileExists(key: string): Promise<boolean>;

  getFileMetadata(key: string): Promise<FileMetadata>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
