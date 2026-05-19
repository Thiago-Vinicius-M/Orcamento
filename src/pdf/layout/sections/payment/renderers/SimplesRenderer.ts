import type { PDFFont, PDFPage } from "pdf-lib";
import { PDF_PRIMARY } from "../../../../PdfPainter";

export function renderSimples(
  page: PDFPage,
  x: number,
  y: number,
  label: string,
  fontTitle: PDFFont,
): number {
  page.drawText(label, { x, y, size: 9.5, font: fontTitle, color: PDF_PRIMARY });
  return 14;
}

export function estimateHeightSimples(): number {
  return 22;
}
