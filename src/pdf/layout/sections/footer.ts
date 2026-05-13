import type { PDFFont } from "pdf-lib";
import { PDF_TEXT_MEDIUM } from "../../PdfPainter";
import type { PdfPageContext } from "../../PdfPageContext";

export function drawOrcamentoPdfFooterNumeracao(pageCtx: PdfPageContext, font: PDFFont): void {
  pageCtx.drawPageFooters(font, PDF_TEXT_MEDIUM);
}
