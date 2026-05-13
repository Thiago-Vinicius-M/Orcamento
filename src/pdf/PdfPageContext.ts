import type { PDFDocument, PDFFont, PDFPage } from "pdf-lib";
import type { PdfDrawContext, PdfRgb } from "./pdfTypes";

export const PDF_FOOTER_H = 50;

export function pdfContentMinY(margin: number): number {
  return margin + PDF_FOOTER_H + 15;
}

export class PdfPageContext {
  private readonly pdfDoc: PDFDocument;
  private readonly pageMargin: number;
  private readonly onNewPageDecor: (page: PDFPage, w: number, h: number) => void;
  private _page: PDFPage;
  private _width: number;
  private _height: number;

  constructor(
    pdfDoc: PDFDocument,
    pageMargin: number,
    onNewPageDecor: (page: PDFPage, w: number, h: number) => void,
  ) {
    this.pdfDoc = pdfDoc;
    this.pageMargin = pageMargin;
    this.onNewPageDecor = onNewPageDecor;
    this._page = pdfDoc.addPage();
    const s = this._page.getSize();
    this._width = s.width;
    this._height = s.height;
    this.onNewPageDecor(this._page, this._width, this._height);
  }

  get page(): PDFPage {
    return this._page;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  getMargin(): number {
    return this.pageMargin;
  }

  contentMinY(): number {
    return pdfContentMinY(this.pageMargin);
  }

  newPage(): PdfDrawContext {
    this._page = this.pdfDoc.addPage();
    const s = this._page.getSize();
    this._width = s.width;
    this._height = s.height;
    this.onNewPageDecor(this._page, this._width, this._height);
    return { page: this._page, cursorY: this._height - this.pageMargin };
  }

  ensureSpace(ctx: PdfDrawContext, need: number): PdfDrawContext {
    if (ctx.cursorY - need >= this.contentMinY()) return ctx;
    return this.newPage();
  }

  initialContext(): PdfDrawContext {
    return { page: this._page, cursorY: this._height - this.pageMargin };
  }

  drawPageFooters(font: PDFFont, textColor: PdfRgb): void {
    const pages = this.pdfDoc.getPages();
    const n = pages.length;
    for (let i = 0; i < n; i++) {
      const p = pages[i]!;
      const { width } = p.getSize();

      const s = 7;
      const pg = `Página ${i + 1} de ${n}`;
      const pw = font.widthOfTextAtSize(pg, s);

      p.drawText(pg, {
        x: width / 2 - pw / 2,
        y: this.pageMargin - 20,
        size: s,
        font,
        color: textColor,
      });
    }
  }
}
