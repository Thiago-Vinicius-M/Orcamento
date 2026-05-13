import type { PDFFont } from "pdf-lib";
import type { OrcamentoPdfViewModel } from "../../orcamentoPdfPresenter";
import type { PdfDrawContext, PdfRgb } from "../../pdfTypes";
import { PDF_ACCENT, PDF_TEXT_MEDIUM, PdfPainter } from "../../PdfPainter";

import type { PdfPageContext } from "../../PdfPageContext";
import { computeOrcamentoPdfTableLayout } from "../orcamentoPdfTableLayout";

export function drawOrcamentoPdfObservationsSection(
  ctx: PdfDrawContext,
  model: OrcamentoPdfViewModel,
  args: {
    margin: number;
    pageCtx: PdfPageContext;
    fontTitle: PDFFont;
    fontNormal: PDFFont;
    painter: PdfPainter;
    ensureSpace: (c: PdfDrawContext, need: number) => PdfDrawContext;
    drawTextLine: (c: PdfDrawContext, text: string, opt?: { size?: number; color?: PdfRgb }) => PdfDrawContext;
  },
): PdfDrawContext {
  if (!model.observacoes) return ctx;

  const { margin, pageCtx, fontTitle, fontNormal, painter, ensureSpace, drawTextLine } = args;

  let c = ensureSpace(ctx, 60);
  const contentW = computeOrcamentoPdfTableLayout(pageCtx.width, margin).contentW;
  c.page.drawText("NOTAS ADICIONAIS", { x: margin, y: c.cursorY, size: 8, font: fontTitle, color: PDF_ACCENT });
  c = { ...c, cursorY: c.cursorY - 14 };
  for (const line of painter.wrapWordsToWidth(fontNormal, model.observacoes, contentW, 9)) {
    c = ensureSpace(c, 12);
    c = drawTextLine(c, line, { size: 9, color: PDF_TEXT_MEDIUM });
  }
  return { ...c, cursorY: c.cursorY - 15 };
}
