import type { PDFFont, PDFPage } from "pdf-lib";
import {
  PDF_BG_LIGHT,
  PDF_BORDER,
  PDF_PRIMARY,
  PDF_TEXT_DARK,
  PDF_TEXT_MEDIUM,
  PDF_WHITE,
  PdfPainter,
} from "../../../../PdfPainter";

export type BoletoChipsData = {
  primVencTexto: string;
  intervaloTexto: string;
  numParcelasTexto: string;
  valorParcelaTexto: string;
};

export type TabelaBoletoRow = { numero: number; data: string; valor: string };

export type ResumoBoxRow = { rotulo: string; valor: string; destaque?: boolean };

export function renderBoletoHeader(page: PDFPage, x: number, y: number, fontTitle: PDFFont): void {
  const bx = x + 8;
  page.drawRectangle({ x: bx,      y: y - 11, width: 2,  height: 10, color: PDF_TEXT_DARK });
  page.drawRectangle({ x: bx + 4,  y: y - 11, width: 4,  height: 10, color: PDF_TEXT_DARK });
  page.drawRectangle({ x: bx + 10, y: y - 11, width: 2,  height: 10, color: PDF_TEXT_DARK });
  page.drawText("Boleto Bancário", { x: bx + 16, y: y - 11, size: 9, font: fontTitle, color: PDF_TEXT_DARK });
}

export function renderBoletoChips(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  painter: PdfPainter,
  fonts: { fontTitle: PDFFont; fontNormal: PDFFont },
  data: BoletoChipsData,
): number {
  const { fontTitle, fontNormal } = fonts;
  const chipH = 38;
  const gap = 6;
  const numChips = 4;
  const chipW = Math.floor((width - gap * (numChips - 1)) / numChips);

  const chips: [string, string][] = [
    ["1º Vencimento", data.primVencTexto],
    ["Intervalo", data.intervaloTexto],
    ["Qtd. Parcelas", data.numParcelasTexto],
    ["Valor por Parcela", data.valorParcelaTexto],
  ];

  for (let i = 0; i < chips.length; i++) {
    const cx = x + i * (chipW + gap);
    const [label, valor] = chips[i]!;
    painter.drawRect(page, { x: cx, y: y - chipH, width: chipW, height: chipH, color: PDF_BG_LIGHT, borderColor: PDF_BORDER, borderWidth: 0.4 });
    page.drawText(label, { x: cx + 6, y: y - 13, size: 6, font: fontNormal, color: PDF_TEXT_MEDIUM });
    const valorExibido = painter.truncateToWidth(fontTitle, valor, chipW - 12, 9);
    page.drawText(valorExibido, { x: cx + 6, y: y - 27, size: 9, font: fontTitle, color: PDF_PRIMARY });
  }

  return chipH;
}

export function renderTabelaBoleto(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  painter: PdfPainter,
  fonts: { fontTitle: PDFFont; fontNormal: PDFFont },
  parcelas: TabelaBoletoRow[],
): number {
  const { fontTitle, fontNormal } = fonts;
  const colParcela = Math.floor(width * 0.14);
  const rowH = 16;
  const headerH = 18;

  painter.drawRect(page, { x, y: y - headerH, width, height: headerH, color: PDF_PRIMARY });
  page.drawText("Parcela",    { x: x + 5,              y: y - 12, size: 7.5, font: fontTitle, color: PDF_WHITE });
  page.drawText("Vencimento", { x: x + colParcela + 5, y: y - 12, size: 7.5, font: fontTitle, color: PDF_WHITE });
  painter.drawRight(page, "Valor", x + width - 5, y - 12, 7.5, fontTitle, PDF_WHITE);

  let py = y - headerH;
  for (let i = 0; i < parcelas.length; i++) {
    const p = parcelas[i]!;
    const rowBg = i % 2 === 0 ? PDF_BG_LIGHT : PDF_WHITE;
    painter.drawRect(page, { x, y: py - rowH, width, height: rowH, color: rowBg, borderColor: PDF_BORDER, borderWidth: 0.3 });
    const textY = py - 11;
    page.drawText(`${p.numero}.`, { x: x + 5,              y: textY, size: 7.5, font: fontNormal, color: PDF_TEXT_DARK });
    page.drawText(p.data,         { x: x + colParcela + 5, y: textY, size: 7.5, font: fontNormal, color: PDF_TEXT_DARK });
    painter.drawRight(page, p.valor, x + width - 5, textY, 7.5, fontNormal, PDF_TEXT_DARK);
    py -= rowH;
  }

  return headerH + parcelas.length * rowH + 4;
}

export function renderResumoBox(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  painter: PdfPainter,
  fonts: { fontTitle: PDFFont; fontNormal: PDFFont },
  rows: ResumoBoxRow[],
): number {
  const { fontTitle, fontNormal } = fonts;
  const padX = 8;
  const rowH = 16;
  const titleH = 22;
  const boxH = titleH + rows.length * rowH + 6;

  painter.drawRect(page, { x, y: y - boxH, width, height: boxH, color: PDF_BG_LIGHT, borderColor: PDF_BORDER, borderWidth: 0.5 });
  page.drawText("Resumo do pagamento", { x: x + padX, y: y - 13, size: 8, font: fontTitle, color: PDF_TEXT_DARK });
  page.drawLine({ start: { x, y: y - titleH }, end: { x: x + width, y: y - titleH }, color: PDF_BORDER, thickness: 0.4 });

  let ry = y - titleH - rowH + 5;
  for (const row of rows) {
    if (row.destaque) {
      painter.drawRect(page, { x, y: ry - 5, width, height: rowH, color: PDF_PRIMARY });
      page.drawText(row.rotulo, { x: x + padX, y: ry + 2, size: 7.5, font: fontTitle, color: PDF_WHITE });
      painter.drawRight(page, row.valor, x + width - padX, ry + 2, 8, fontTitle, PDF_WHITE);
    } else {
      page.drawText(row.rotulo, { x: x + padX, y: ry + 2, size: 7.5, font: fontNormal, color: PDF_TEXT_MEDIUM });
      painter.drawRight(page, row.valor, x + width - padX, ry + 2, 8, fontTitle, PDF_TEXT_DARK);
    }
    ry -= rowH;
  }

  return boxH;
}

export function estimateHeightBoletoChips(): number {
  return 62; // 20 header + 38 chips + 4 gap
}

export function estimateHeightTabelaBoleto(numParcelas: number): number {
  return 18 + numParcelas * 16 + 10;
}

export function estimateHeightResumoBox(numRows: number): number {
  return 22 + numRows * 16 + 6;
}
