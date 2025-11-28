import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export interface WatermarkOptions {
  userEmail: string;
  userName: string;
  userId: string;
}

@Injectable()
export class PdfWatermarkService {
  /**
   * Apply minimal watermark to PDF - just 1 line per page
   * Keeps file size close to original
   */
  async applyWatermark(
    pdfBuffer: Buffer,
    options: WatermarkOptions,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      updateMetadata: false,
    });
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const watermarkText = `Licensed to: ${options.userName} (${options.userEmail})`;

    for (const page of pages) {
      this.applyWatermarkToPage(page, watermarkText, font);
    }

    const watermarkedPdf = await pdfDoc.save();
    return Buffer.from(watermarkedPdf);
  }

  private applyWatermarkToPage(
    page: import('pdf-lib').PDFPage,
    text: string,
    font: import('pdf-lib').PDFFont,
  ): void {
    const { width, height } = page.getSize();

    // Single diagonal watermark in the center - minimal but visible
    page.drawText(text, {
      x: width * 0.1,
      y: height * 0.5,
      size: 12,
      font,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.15,
      rotate: degrees(-45),
    });
  }

  /**
   * Check if a file is a PDF based on its mime type
   */
  isPdf(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }
}
