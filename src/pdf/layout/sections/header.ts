import type { PDFFont } from "pdf-lib";
import type { OrcamentoPdfViewModel } from "../../orcamentoPdfPresenter";
import type { PdfDrawContext } from "../../pdfTypes";
import { PDF_ACCENT, PDF_PRIMARY, PDF_TEXT_DARK, PDF_TEXT_MEDIUM, PdfPainter } from "../../PdfPainter";

export function drawOrcamentoPdfHeader(
  ctx: PdfDrawContext,
  model: OrcamentoPdfViewModel,
  args: {
    margin: number;
    pageWidth: number;
    pageHeight: number;
    fontTitle: PDFFont;
    fontNormal: PDFFont;
    painter: PdfPainter;
    gap: number;
  },
): PdfDrawContext {
  const { margin, pageWidth, pageHeight, fontTitle, fontNormal, painter, gap } = args;
  const top = pageHeight - margin;

  ctx.page.drawLine({
    start: { x: margin, y: top },
    end: { x: margin, y: top - 45 },
    color: PDF_ACCENT,
    thickness: 3,
  });

  ctx.page.drawText(model.empresaNome.toUpperCase(), {
    x: margin + 12,
    y: top - 12,
    size: 11,
    font: fontTitle,
    color: PDF_TEXT_MEDIUM,
  });

  const num = model.orcamentoNumero.replace(/^Nº\s*/i, "#");
  ctx.page.drawText(`${model.tituloDocumento.toUpperCase()} ${num}`, {
    x: margin + 12,
    y: top - 35,
    size: 10,
    font: fontTitle,
    color: PDF_PRIMARY,
  });

  painter.drawRight(ctx.page, `Emitido em: ${model.dataEmissao}`, pageWidth - margin, top - 32, 9, fontNormal, PDF_TEXT_MEDIUM);
  painter.drawRight(ctx.page, `Válido até: ${model.dataValidade}`, pageWidth - margin, top - 46, 9, fontNormal, PDF_TEXT_MEDIUM);
  if (model.geradoPorLinha) {
    const maxGeradoW = Math.max(100, pageWidth - 2 * margin - 200);
    const linhaGerado = painter.truncateToWidth(fontNormal, model.geradoPorLinha, maxGeradoW, 9);
    painter.drawRight(ctx.page, linhaGerado, pageWidth - margin, top - 60, 9, fontNormal, PDF_TEXT_MEDIUM);
  }

  let yc = top - 85;
  ctx.page.drawText("CLIENTE", { x: margin, y: yc, size: 8, font: fontTitle, color: PDF_ACCENT });
  yc -= 16;
  for (const line of model.clienteLinhas) {
    ctx.page.drawText(line, { x: margin, y: yc, size: 10, font: fontNormal, color: PDF_TEXT_DARK });
    yc -= 13;
  }

  return { ...ctx, cursorY: yc - gap };
}
