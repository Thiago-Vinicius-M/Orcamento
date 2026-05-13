import type { PDFFont } from "pdf-lib";
import type { OrcamentoPdfViewModel } from "../../orcamentoPdfPresenter";
import type { PdfDrawContext, PdfRgb } from "../../pdfTypes";
import { PDF_ACCENT, PDF_PRIMARY, PDF_TEXT_DARK, PDF_TEXT_MEDIUM, PdfPainter } from "../../PdfPainter";
import type { PdfPageContext } from "../../PdfPageContext";
import { computeOrcamentoPdfTableLayout } from "../orcamentoPdfTableLayout";

export function drawOrcamentoPdfPaymentAndTermsSection(
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
  const { margin, pageCtx, fontTitle, fontNormal, painter, ensureSpace, drawTextLine } = args;

  let c = ensureSpace(ctx, 140);
  const footerTop = c.cursorY;
  c.page.drawLine({
    start: { x: margin, y: footerTop },
    end: { x: margin + 30, y: footerTop },
    color: PDF_ACCENT,
    thickness: 2,
  });

  c = { ...c, cursorY: footerTop - 15 };
  const L = computeOrcamentoPdfTableLayout(pageCtx.width, margin);
  const rightX = margin + L.contentW * 0.52;
  const sectionY = c.cursorY;

  c.page.drawText("PAGAMENTO", { x: margin, y: sectionY, size: 8, font: fontTitle, color: PDF_PRIMARY });
  let py = sectionY - 14;
  const payLines = model.pagamentoResumo.split(" | ").map((s) => s.trim());
  for (const ln of payLines) {
    c.page.drawText(ln, { x: margin, y: py, size: 8.5, font: fontNormal, color: PDF_TEXT_DARK });
    py -= 11;
  }

  let ry = sectionY;
  c.page.drawText("CONTATO", { x: rightX, y: ry, size: 8, font: fontTitle, color: PDF_PRIMARY });
  ry -= 14;
  const contactParts = model.rodape.contato ? model.rodape.contato.split(" | ") : [];
  for (const part of contactParts) {
    c.page.drawText(part, { x: rightX, y: ry, size: 8.5, font: fontNormal, color: PDF_TEXT_DARK });
    ry -= 11;
  }

  c = { ...c, cursorY: Math.min(py, ry) - 20 };
  c.page.drawText("VALIDADE E CONDIÇÕES", { x: margin, y: c.cursorY, size: 8, font: fontTitle, color: PDF_PRIMARY });
  c = { ...c, cursorY: c.cursorY - 12 };
  const termos = `${model.avisoValidade}. ${model.termosCondicoes}`;
  for (const line of painter.wrapWordsToWidth(fontNormal, termos, L.contentW, 7.5)) {
    c = drawTextLine(c, line, { size: 7.5, color: PDF_TEXT_MEDIUM });
  }

  return c;
}
