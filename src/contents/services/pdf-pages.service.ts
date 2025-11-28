import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export interface PageExtractionOptions {
  startPage: number; // 0-indexed
  pageCount: number;
  watermark?:
    | {
        userName: string;
        userEmail: string;
      }
    | undefined;
}

export interface ExtractedPages {
  pdfBuffer: Buffer;
  totalPages: number;
  startPage: number;
  endPage: number;
  hasMore: boolean;
}

@Injectable()
export class PdfPagesService {
  private readonly DEFAULT_CHUNK_SIZE = 15;

  /**
   * Extract a range of pages from a PDF and optionally apply watermark
   */
  async extractPages(
    pdfBuffer: Buffer,
    options: PageExtractionOptions,
  ): Promise<ExtractedPages> {
    const sourcePdf = await PDFDocument.load(pdfBuffer, {
      updateMetadata: false,
    });
    const totalPages = sourcePdf.getPageCount();

    // Validate range
    const startPage = Math.max(0, Math.min(options.startPage, totalPages - 1));
    const endPage = Math.min(startPage + options.pageCount - 1, totalPages - 1);
    const actualPageCount = endPage - startPage + 1;

    // Create new PDF with just the requested pages
    const newPdf = await PDFDocument.create();

    // Copy pages
    const pageIndices = Array.from(
      { length: actualPageCount },
      (_, i) => startPage + i,
    );
    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);

    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    // Apply watermark if requested
    if (options.watermark) {
      await this.applyWatermark(newPdf, options.watermark);
    }

    // Save with object streams enabled for better compression
    const outputBuffer = await newPdf.save({
      useObjectStreams: true,
    });

    return {
      pdfBuffer: Buffer.from(outputBuffer),
      totalPages,
      startPage,
      endPage,
      hasMore: endPage < totalPages - 1,
    };
  }

  /**
   * Get total page count without loading entire PDF into memory
   */
  async getPageCount(pdfBuffer: Buffer): Promise<number> {
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      updateMetadata: false,
    });
    return pdfDoc.getPageCount();
  }

  /**
   * Apply watermark to all pages in a PDF document
   */
  private async applyWatermark(
    pdfDoc: PDFDocument,
    watermark: { userName: string; userEmail: string },
  ): Promise<void> {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const text = `Licensed to: ${watermark.userName} (${watermark.userEmail})`;

    for (const page of pages) {
      const { width, height } = page.getSize();

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
  }

  get defaultChunkSize(): number {
    return this.DEFAULT_CHUNK_SIZE;
  }
}
