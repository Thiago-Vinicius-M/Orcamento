import { rgb, type PDFFont } from "pdf-lib";
import type { OrcamentoPdfViewModel } from "../../orcamentoPdfPresenter";
import type { PdfDrawContext } from "../../pdfTypes";
import {
  PDF_ACCENT,
  PDF_BG_LIGHT,
  PDF_BORDER,
  PDF_PRIMARY,
  PDF_TEXT_MEDIUM,
  PdfPainter,
} from "../../PdfPainter";
import type { PdfPageContext } from "../../PdfPageContext";
import { computeOrcamentoPdfTableLayout } from "../orcamentoPdfTableLayout";

function drawTableHeader(
  ctx: PdfDrawContext,
  args: {
    margin: number;
    fontTitle: PDFFont;
    painter: PdfPainter;
    pageCtx: PdfPageContext;
  },
): PdfDrawContext {
  const { margin, fontTitle, painter, pageCtx } = args;
  const L = computeOrcamentoPdfTableLayout(pageCtx.width, margin);

  const h = 24;
  const yTop = ctx.cursorY;
  const yRect = yTop - h;
  const xLeft = margin;
  const xRight = margin + L.contentW;
  const headerBg = rgb(0.93, 0.94, 0.96);
  const headerLine = rgb(0.8, 0.82, 0.86);

  ctx.page.drawRectangle({
    x: margin,
    y: yRect,
    width: L.contentW,
    height: h,
    color: headerBg,
  });

  const ty = yRect + 7;
  ctx.page.drawText("PRODUTO", { x: L.xServ + 8, y: ty, size: 9, font: fontTitle, color: PDF_PRIMARY });
  ctx.page.drawText("DESCRIÇÃO DETALHADA", { x: L.xDesc + 8, y: ty, size: 9, font: fontTitle, color: PDF_PRIMARY });
  painter.drawRight(ctx.page, "TOTAL", L.xValor + L.colValorW - 8, ty, 8.5, fontTitle, PDF_PRIMARY);

  ctx.page.drawLine({ start: { x: xLeft, y: yRect }, end: { x: xRight, y: yRect }, color: headerLine, thickness: 0.8 });
  ctx.page.drawLine({ start: { x: xLeft, y: yTop }, end: { x: xRight, y: yTop }, color: headerLine, thickness: 0.8 });
  ctx.page.drawLine({ start: { x: xLeft, y: yRect }, end: { x: xLeft, y: yTop }, color: headerLine, thickness: 0.8 });
  ctx.page.drawLine({ start: { x: xRight, y: yRect }, end: { x: xRight, y: yTop }, color: headerLine, thickness: 0.8 });
  ctx.page.drawLine({ start: { x: L.xDesc, y: yRect }, end: { x: L.xDesc, y: yTop }, color: headerLine, thickness: 0.8 });
  ctx.page.drawLine({ start: { x: L.xValor, y: yRect }, end: { x: L.xValor, y: yTop }, color: headerLine, thickness: 0.8 });

  return { ...ctx, cursorY: yRect - 8 };
}

export function drawOrcamentoPdfItemsSection(
  ctx: PdfDrawContext,
  model: OrcamentoPdfViewModel,
  args: {
    margin: number;
    fontTitle: PDFFont;
    fontNormal: PDFFont;
    painter: PdfPainter;
    pageCtx: PdfPageContext;
    minY: () => number;
    newPage: () => PdfDrawContext;
  },
): PdfDrawContext {
  const { margin, fontTitle, fontNormal, painter, pageCtx, minY, newPage } = args;

  let c = drawTableHeader(ctx, { margin, fontTitle, painter, pageCtx });

  const itemSize = 9.5;
  const descSize = 8.5;
  const itemLh = 12;

  for (const item of model.itens) {
    const L = computeOrcamentoPdfTableLayout(pageCtx.width, margin);
    const servText = painter.truncateToWidth(fontTitle, item.descricao, L.colServW - 15, itemSize);
    const descLines = [
      `Qtd: ${item.quantidade} | Unit: ${item.precoUnitario}`,
      ...painter.wrapWordsToWidth(fontNormal, item.descricao, L.colDescW - 16, descSize),
    ];

    const descH = descLines.length * itemLh;
    const rowH = Math.max(24, descH + 12);

    if (c.cursorY - rowH < minY()) {
      c = newPage();
      c = drawTableHeader(c, { margin, fontTitle, painter, pageCtx });
    }

    const L2 = computeOrcamentoPdfTableLayout(pageCtx.width, margin);
    const baseY = c.cursorY;
    const rowBottom = baseY - rowH;
    const xLeft = margin;
    const xRight = margin + L2.contentW;

    c.page.drawLine({
      start: { x: margin, y: rowBottom },
      end: { x: pageCtx.width - margin, y: rowBottom },
      color: PDF_BORDER,
      thickness: 0.5,
    });

    c.page.drawRectangle({
      x: L2.xValor,
      y: rowBottom + 0.5,
      width: L2.colValorW,
      height: rowH - 0.5,
      color: PDF_BG_LIGHT,
    });

    c.page.drawLine({ start: { x: xLeft, y: rowBottom }, end: { x: xLeft, y: baseY }, color: PDF_BORDER, thickness: 0.6 });
    c.page.drawLine({ start: { x: xRight, y: rowBottom }, end: { x: xRight, y: baseY }, color: PDF_BORDER, thickness: 0.6 });
    c.page.drawLine({ start: { x: L2.xDesc, y: rowBottom }, end: { x: L2.xDesc, y: baseY }, color: PDF_BORDER, thickness: 0.6 });
    c.page.drawLine({ start: { x: L2.xValor, y: rowBottom }, end: { x: L2.xValor, y: baseY }, color: PDF_BORDER, thickness: 0.6 });

    c.page.drawText(servText, {
      x: L2.xServ + 8,
      y: baseY - 15,
      size: itemSize,
      font: fontTitle,
      color: PDF_PRIMARY,
    });

    let dy = baseY - 15;
    for (let i = 0; i < descLines.length; i++) {
      const color = i === 0 ? PDF_ACCENT : PDF_TEXT_MEDIUM;
      const font = i === 0 ? fontTitle : fontNormal;
      c.page.drawText(descLines[i]!, { x: L2.xDesc + 8, y: dy, size: descSize, font, color });
      dy -= itemLh;
    }

    painter.drawRight(c.page, item.subtotal, L2.xValor + L2.colValorW - 8, baseY - 15, 10, fontTitle, PDF_PRIMARY);

    c = { ...c, cursorY: rowBottom - 5 };
  }

  return c;
}
