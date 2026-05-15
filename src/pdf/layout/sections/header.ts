import type { PDFFont, PDFImage } from "pdf-lib";
import type { OrcamentoPdfViewModel } from "../../orcamentoPdfPresenter";
import type { PdfDrawContext } from "../../pdfTypes";
import { PDF_ACCENT, PDF_BORDER, PDF_PRIMARY, PDF_TEXT_DARK, PDF_TEXT_MEDIUM, PdfPainter } from "../../PdfPainter";

const MAX_LOGO_H = 40;
const MAX_LOGO_W = 140;

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
    logo?: PDFImage;
  },
): PdfDrawContext {
  const { margin, pageWidth, pageHeight, fontTitle, fontNormal, painter, gap, logo } = args;
  const top = pageHeight - margin;

  ctx.page.drawLine({
    start: { x: margin, y: top },
    end: { x: margin, y: top - 45 },
    color: PDF_ACCENT,
    thickness: 3,
  });

  // Logo opcional — posicionada à direita da barra de acento, alinhada ao topo
  let logoOffset = 0;
  let logoDisplayH = 0;
  if (logo) {
    const dims = logo.scale(1);
    const scale = Math.min(MAX_LOGO_H / dims.height, MAX_LOGO_W / dims.width, 1);
    const displayW = dims.width * scale;
    const displayH = dims.height * scale;
    logoDisplayH = displayH;
    ctx.page.drawImage(logo, {
      x: margin + 12,
      y: top - 8 - displayH,
      width: displayW,
      height: displayH,
    });
    logoOffset = displayW + 8;
  }

  ctx.page.drawText(model.empresaNome.toUpperCase(), {
    x: margin + 12 + logoOffset,
    y: top - 12,
    size: 11,
    font: fontTitle,
    color: PDF_TEXT_MEDIUM,
  });

  const num = model.orcamentoNumero.replace(/^Nº\s*/i, "#");
  ctx.page.drawText(`${model.tituloDocumento.toUpperCase()} ${num}`, {
    x: margin + 12 + logoOffset,
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

  // Separador horizontal — abaixo do elemento mais baixo do cabeçalho (texto ou logo)
  let lowestHeaderY = model.geradoPorLinha ? top - 68 : top - 54;
  if (logo) {
    lowestHeaderY = Math.min(lowestHeaderY, top - 8 - logoDisplayH - 4);
  }
  const separatorY = lowestHeaderY - 4;
  ctx.page.drawLine({
    start: { x: margin, y: separatorY },
    end: { x: pageWidth - margin, y: separatorY },
    color: PDF_BORDER,
    thickness: 0.5,
  });

  let yc = separatorY - 12;
  ctx.page.drawText("CLIENTE", { x: margin, y: yc, size: 8, font: fontTitle, color: PDF_ACCENT });
  yc -= 16;
  for (const line of model.clienteLinhas) {
    ctx.page.drawText(line, { x: margin, y: yc, size: 10, font: fontNormal, color: PDF_TEXT_DARK });
    yc -= 13;
  }

  return { ...ctx, cursorY: yc - gap };
}
