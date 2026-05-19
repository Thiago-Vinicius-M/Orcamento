import type { PDFFont, PDFPage } from "pdf-lib";
import { PDF_TEXT_MEDIUM, PdfPainter } from "../../../../PdfPainter";

export function renderAviso(
  page: PDFPage,
  x: number,
  y: number,
  maxWidth: number,
  texto: string,
  painter: PdfPainter,
  fontNormal: PDFFont,
): number {
  const linhas = painter.wrapWordsToWidth(fontNormal, texto, maxWidth, 7);
  let ly = y;
  for (const linha of linhas) {
    page.drawText(linha, { x, y: ly, size: 7, font: fontNormal, color: PDF_TEXT_MEDIUM });
    ly -= 10;
  }
  return linhas.length * 10 + 4;
}

export function estimateHeightAviso(): number {
  return 30;
}
