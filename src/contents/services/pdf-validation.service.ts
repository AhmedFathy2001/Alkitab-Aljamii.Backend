import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { I18nService } from 'nestjs-i18n';

export interface PdfValidationResult {
  isValid: boolean;
  pageCount?: number;
  error?: string;
}

@Injectable()
export class PdfValidationService {
  // PDF magic bytes: %PDF-
  private readonly PDF_MAGIC_BYTES = Buffer.from([
    0x25, 0x50, 0x44, 0x46, 0x2d,
  ]);

  constructor(private readonly i18n: I18nService) {}

  /**
   * Validates that a buffer contains a valid PDF file
   * Checks both magic bytes and structural integrity
   */
  async validatePdf(buffer: Buffer): Promise<PdfValidationResult> {
    // Check magic bytes first (fast check)
    if (!this.hasPdfMagicBytes(buffer)) {
      return {
        isValid: false,
        error: await this.i18n.translate('content.INVALID_PDF_SIGNATURE'),
      };
    }

    // Validate PDF structure by attempting to parse it
    try {
      const pdfDoc = await PDFDocument.load(buffer, {
        updateMetadata: false,
      });

      const pageCount = pdfDoc.getPageCount();

      if (pageCount === 0) {
        return {
          isValid: false,
          error: await this.i18n.translate('content.PDF_NO_PAGES'),
        };
      }

      return {
        isValid: true,
        pageCount,
      };
    } catch {
      return {
        isValid: false,
        error: await this.i18n.translate('content.PDF_CORRUPTED'),
      };
    }
  }

  /**
   * Validates PDF and throws BadRequestException if invalid
   */
  async assertValidPdf(buffer: Buffer, mimeType: string): Promise<number> {
    // Only validate PDF files
    if (mimeType !== 'application/pdf') {
      return 0;
    }

    const result = await this.validatePdf(buffer);

    if (!result.isValid) {
      throw new BadRequestException(result.error);
    }

    return result.pageCount ?? 0;
  }

  /**
   * Checks if the buffer starts with PDF magic bytes (%PDF-)
   */
  private hasPdfMagicBytes(buffer: Buffer): boolean {
    if (buffer.length < this.PDF_MAGIC_BYTES.length) {
      return false;
    }

    return buffer
      .subarray(0, this.PDF_MAGIC_BYTES.length)
      .equals(this.PDF_MAGIC_BYTES);
  }
}
