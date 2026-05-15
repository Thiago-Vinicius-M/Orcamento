import { PDFDocument, type PDFFont, type PDFImage } from "pdf-lib";
import { embedPdfFonts } from "../orcamentoPdfFontLoader";
import { loadLogoForPdf } from "../orcamentoPdfLogoLoader";
import type { OrcamentoPdfViewModel } from "../orcamentoPdfPresenter";
import { PdfPainter } from "../PdfPainter";
import { PdfPageContext } from "../PdfPageContext";
import type { PdfDrawContext, PdfRgb } from "../pdfTypes";
import { drawOrcamentoPdfFooterNumeracao } from "./sections/footer";
import { drawOrcamentoPdfHeader } from "./sections/header";
import { drawOrcamentoPdfItemsSection } from "./sections/items";
import { drawOrcamentoPdfObservationsSection } from "./sections/observations";
import { drawOrcamentoPdfPaymentAndTermsSection } from "./sections/payment";
import { drawOrcamentoPdfTotalsSection } from "./sections/totals";

export type RenderizarOrcamentoPdfLayoutOptions = {
  /**
   * Quando true, define datas de criação/alteração do PDF de forma fixa.
   * Usado apenas por testes de caracterização (hashes estáveis); produção não deve usar.
   */
  freezeDocumentDates?: boolean;
};

export async function renderOrcamentoPdfLayout(
  model: OrcamentoPdfViewModel,
  options?: RenderizarOrcamentoPdfLayoutOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const { fontTitle, fontNormal } = await embedPdfFonts(pdfDoc);

  const logoData = await loadLogoForPdf(model.logoUrl);
  const embeddedLogo: PDFImage | null = logoData
    ? logoData.format === 'png'
      ? await pdfDoc.embedPng(logoData.bytes)
      : await pdfDoc.embedJpg(logoData.bytes)
    : null;

  const painter = new PdfPainter(fontTitle, fontNormal);
  const m = 48;
  const lh = 14;
  const gap = 20;

  const pageCtx = new PdfPageContext(pdfDoc, m, (p, w, h) => painter.drawCornerDecor(p, w, h));

  const minY = () => pageCtx.contentMinY();
  const newPage = (): PdfDrawContext => pageCtx.newPage();
  const ensureSpace = (c: PdfDrawContext, need: number) => pageCtx.ensureSpace(c, need);

  const drawTextLine = (
    c: PdfDrawContext,
    text: string,
    opt?: { x?: number; y?: number; size?: number; font?: PDFFont; color?: PdfRgb },
  ) => painter.drawTextLine(c, m, lh, text, opt);

  let ctx = pageCtx.initialContext();

  ctx = drawOrcamentoPdfHeader(ctx, model, {
    margin: m,
    pageWidth: pageCtx.width,
    pageHeight: pageCtx.height,
    fontTitle,
    fontNormal,
    painter,
    gap,
    logo: embeddedLogo ?? undefined,
  });

  ctx = drawOrcamentoPdfItemsSection(ctx, model, {
    margin: m,
    fontTitle,
    fontNormal,
    painter,
    pageCtx,
    minY,
    newPage,
  });

  ctx = drawOrcamentoPdfTotalsSection(ctx, model, {
    margin: m,
    lh,
    fontTitle,
    fontNormal,
    painter,
    pageCtx,
    ensureSpace,
  });

  ctx = drawOrcamentoPdfObservationsSection(ctx, model, {
    margin: m,
    pageCtx,
    fontTitle,
    fontNormal,
    painter,
    ensureSpace,
    drawTextLine,
  });

  drawOrcamentoPdfPaymentAndTermsSection(ctx, model, {
    margin: m,
    pageCtx,
    fontTitle,
    fontNormal,
    painter,
    ensureSpace,
    drawTextLine,
  });

  drawOrcamentoPdfFooterNumeracao(pageCtx, fontNormal);

  if (options?.freezeDocumentDates) {
    const frozen = new Date("2024-01-01T00:00:00.000Z");
    pdfDoc.setCreationDate(frozen);
    pdfDoc.setModificationDate(frozen);
  }

  return pdfDoc.save();
}
