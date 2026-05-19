import type { PDFFont, PDFPage } from "pdf-lib";
import { PDF_PRIMARY, PDF_TEXT_DARK, PDF_TEXT_MEDIUM, PDF_WHITE, PdfPainter } from "../../../../PdfPainter";

export function renderFinanciamentoTitulo(
  page: PDFPage,
  x: number,
  y: number,
  texto: string,
  fontTitle: PDFFont,
): number {
  page.drawText(texto, { x, y, size: 9.5, font: fontTitle, color: PDF_PRIMARY });
  return 14;
}

export function renderFinanciamentoLinha(
  page: PDFPage,
  x: number,
  y: number,
  rotulo: string,
  valor: string,
  fonts: { fontTitle: PDFFont; fontNormal: PDFFont },
): number {
  const { fontNormal } = fonts;
  const rotuloTexto = `${rotulo}: `;
  const rotuloW = fontNormal.widthOfTextAtSize(rotuloTexto, 8.5);
  page.drawText(rotuloTexto, { x, y, size: 8.5, font: fontNormal, color: PDF_TEXT_MEDIUM });
  page.drawText(valor, { x: x + rotuloW, y, size: 8.5, font: fontNormal, color: PDF_TEXT_DARK });
  return 13;
}

export function renderFinanciamentoPill(
  page: PDFPage,
  x: number,
  y: number,
  texto: string,
  painter: PdfPainter,
  fontTitle: PDFFont,
): number {
  const pillSize = 9;
  const padX = 10;
  const padY = 5;
  const textW = fontTitle.widthOfTextAtSize(texto, pillSize);
  const pillW = textW + padX * 2;
  const pillH = pillSize + padY * 2;
  painter.drawRect(page, { x, y: y - padY, width: pillW, height: pillH, color: PDF_PRIMARY });
  page.drawText(texto, { x: x + padX, y, size: pillSize, font: fontTitle, color: PDF_WHITE });
  return pillH + 8;
}

export function estimateHeightFinanciamentoLinha(): number {
  return 14;
}

export function estimateHeightFinanciamentoPill(): number {
  return 26;
}
