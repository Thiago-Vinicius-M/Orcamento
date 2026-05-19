import type { PDFFont, PDFPage } from "pdf-lib";
import { PDF_BG_LIGHT, PDF_BORDER, PDF_PRIMARY, PDF_TEXT_DARK, PDF_TEXT_MEDIUM, PdfPainter } from "../../../../PdfPainter";

export type CreditoRenderData = {
  parcelamentoTexto: string;
  valorTotal: string;
  numParcelasTexto: string;
  valorParcelaTexto: string;
};

export function renderCreditoCard(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  painter: PdfPainter,
  fonts: { fontTitle: PDFFont; fontNormal: PDFFont },
  data: CreditoRenderData,
): number {
  const { fontTitle, fontNormal } = fonts;
  const cardH = 88;
  const padX = 8;

  painter.drawRect(page, { x, y: y - cardH, width, height: cardH, color: PDF_BG_LIGHT, borderColor: PDF_BORDER, borderWidth: 0.5 });
  page.drawText("Cartão de Crédito", { x: x + padX, y: y - 13, size: 9, font: fontTitle, color: PDF_TEXT_DARK });
  page.drawLine({ start: { x, y: y - 22 }, end: { x: x + width, y: y - 22 }, color: PDF_BORDER, thickness: 0.4 });

  const colEsqW = Math.floor(width * 0.46);
  page.drawText("Parcelamento", { x: x + padX, y: y - 33, size: 7, font: fontNormal, color: PDF_TEXT_MEDIUM });
  page.drawText(data.parcelamentoTexto, { x: x + padX, y: y - 48, size: 14, font: fontTitle, color: PDF_PRIMARY });

  const colDirX = x + colEsqW + padX;
  const colDirW = width - colEsqW - padX;
  const detalheRows: [string, string][] = [
    ["Valor total", data.valorTotal],
    ["Número de parcelas", data.numParcelasTexto],
    ["Valor por parcela (est.)", data.valorParcelaTexto],
    ["Forma de cobrança", "Cartão de Crédito"],
  ];
  let ry = y - 33;
  for (const [rotulo, valor] of detalheRows) {
    page.drawText(rotulo, { x: colDirX, y: ry, size: 6.5, font: fontNormal, color: PDF_TEXT_MEDIUM });
    painter.drawRight(page, valor, colDirX + colDirW - padX, ry, 7, fontTitle, PDF_TEXT_DARK);
    ry -= 13;
  }

  return cardH;
}

export function estimateHeightCredito(): number {
  return 96;
}
