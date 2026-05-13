import { rgb, type PDFPage } from "pdf-lib";

export type PdfRgb = ReturnType<typeof rgb>;

export interface PdfDrawContext {
  page: PDFPage;
  cursorY: number;
}
