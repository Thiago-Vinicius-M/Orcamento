import type { PDFFont } from "pdf-lib";
import type { OrcamentoPdfViewModel } from "../../orcamentoPdfPresenter";
import type { PdfDrawContext } from "../../pdfTypes";
import { PDF_ACCENT, PDF_TEXT_DARK, PDF_TEXT_MEDIUM, PdfPainter } from "../../PdfPainter";
import type { PdfPageContext } from "../../PdfPageContext";
import { computeOrcamentoPdfTableLayout } from "../orcamentoPdfTableLayout";

export function drawOrcamentoPdfTotalsSection(
  ctx: PdfDrawContext,
  model: OrcamentoPdfViewModel,
  args: {
    margin: number;
    lh: number;
    fontTitle: PDFFont;
    fontNormal: PDFFont;
    painter: PdfPainter;
    pageCtx: PdfPageContext;
    ensureSpace: (c: PdfDrawContext, need: number) => PdfDrawContext;
  },
): PdfDrawContext {
  const { margin, lh, fontTitle, fontNormal, painter, pageCtx, ensureSpace } = args;

  let c = { ...ctx, cursorY: ctx.cursorY - 20 };
  c = ensureSpace(c, 150);

  const L = computeOrcamentoPdfTableLayout(pageCtx.width, margin);
  const xResumoDir = pageCtx.width - margin;
  const gapResumo = 4;
  const maxRotuloW = L.contentW - 140;
  let yResumo = c.cursorY;

  c.page.drawText("Subtotal", {
    x: margin,
    y: yResumo,
    size: 8.5,
    font: fontNormal,
    color: PDF_TEXT_MEDIUM,
  });
  painter.drawRight(c.page, model.totais.subtotal, xResumoDir, yResumo, 8.5, fontNormal, PDF_TEXT_MEDIUM);
  yResumo -= lh + gapResumo;

  if (model.totais.rotuloDesconto) {
    const rotuloDesc = painter.truncateToWidth(fontTitle, model.totais.rotuloDesconto, maxRotuloW, 9.5);
    c.page.drawText(rotuloDesc, {
      x: margin,
      y: yResumo,
      size: 9.5,
      font: fontTitle,
      color: PDF_ACCENT,
    });
    painter.drawRight(c.page, model.totais.descontoValorDisplay, xResumoDir, yResumo, 9.5, fontTitle, PDF_ACCENT);
    yResumo -= lh + gapResumo;
  }

  if (model.totais.rotuloTaxa) {
    const rotuloTaxa = painter.truncateToWidth(fontNormal, model.totais.rotuloTaxa, maxRotuloW, 9);
    c.page.drawText(rotuloTaxa, {
      x: margin,
      y: yResumo,
      size: 9,
      font: fontNormal,
      color: PDF_TEXT_DARK,
    });
    painter.drawRight(c.page, model.totais.taxas, xResumoDir, yResumo, 9, fontNormal, PDF_TEXT_DARK);
    yResumo -= lh + gapResumo;
  }

  c = { ...c, cursorY: yResumo - 8 };
  painter.drawTotalPill(c.page, fontTitle, `TOTAL: ${model.totais.total}`, pageCtx.width - margin, c.cursorY);

  return { ...c, cursorY: c.cursorY - 50 };
}
