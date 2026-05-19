import { type PDFFont, type PDFPage } from "pdf-lib";
import type { PdfDrawContext, PdfRgb } from "./pdfTypes";
import { PDF_COLORS } from "./PdfDesignTokens";

/** Re-exports de compatibilidade — fonte de verdade em PdfDesignTokens. */
export const PDF_PRIMARY    = PDF_COLORS.PRIMARY;
export const PDF_ACCENT     = PDF_COLORS.ACCENT;
export const PDF_TEXT_DARK  = PDF_COLORS.TEXT_DARK;
export const PDF_TEXT_MEDIUM = PDF_COLORS.TEXT_MEDIUM;
export const PDF_BORDER     = PDF_COLORS.BORDER;
export const PDF_BG_LIGHT   = PDF_COLORS.BG_LIGHT;
export const PDF_WHITE      = PDF_COLORS.WHITE;

export class PdfPainter {
  private readonly fontTitle: PDFFont;
  private readonly fontNormal: PDFFont;

  constructor(fontTitle: PDFFont, fontNormal: PDFFont) {
    this.fontTitle = fontTitle;
    this.fontNormal = fontNormal;
  }

  get fonts(): { fontTitle: PDFFont; fontNormal: PDFFont } {
    return { fontTitle: this.fontTitle, fontNormal: this.fontNormal };
  }

  wrapWordsToWidth(font: PDFFont, text: string, maxWidth: number, size: number): string[] {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];
    const lines: string[] = [];
    let current = words[0]!;
    for (let i = 1; i < words.length; i++) {
      const w = words[i]!;
      const test = `${current} ${w}`;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) {
        current = test;
      } else {
        lines.push(current);
        current = w;
      }
    }
    lines.push(current);
    return lines;
  }

  truncateToWidth(font: PDFFont, text: string, maxW: number, size: number): string {
    if (font.widthOfTextAtSize(text, size) <= maxW) return text;
    let s = text;
    while (s.length > 3 && font.widthOfTextAtSize(`${s.slice(0, -1)}…`, size) > maxW) {
      s = s.slice(0, -1);
    }
    return `${s.slice(0, -1)}…`;
  }

  drawRight(
    page: PDFPage,
    text: string,
    xRight: number,
    y: number,
    size: number,
    font: PDFFont,
    color: PdfRgb = PDF_TEXT_DARK,
  ): void {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: xRight - w, y, size, font, color });
  }

  drawRect(
    page: PDFPage,
    opts: { x: number; y: number; width: number; height: number; color: PdfRgb; borderColor?: PdfRgb; borderWidth?: number },
  ): void {
    page.drawRectangle({
      x: opts.x,
      y: opts.y,
      width: opts.width,
      height: opts.height,
      color: opts.color,
      borderColor: opts.borderColor,
      borderWidth: opts.borderWidth,
    });
  }

  drawCornerDecor(p: PDFPage, w: number, h: number): void {
    p.drawRectangle({
      x: 0,
      y: h - 4,
      width: w,
      height: 4,
      color: PDF_ACCENT,
    });

    p.drawCircle({
      x: w,
      y: h,
      size: 180,
      color: PDF_PRIMARY,
      opacity: 0.03,
    });
  }

  drawTotalPill(page: PDFPage, font: PDFFont, label: string, xRight: number, baselineY: number): void {
    const size = 12;
    const text = label.toUpperCase();
    const tw = font.widthOfTextAtSize(text, size);
    const padX = 18;
    const pillW = tw + padX * 2;
    const pillH = 32;
    const rx = xRight - pillW;
    const ry = baselineY - 10;

    page.drawRectangle({
      x: rx,
      y: ry,
      width: pillW,
      height: pillH,
      color: PDF_PRIMARY,
    });

    page.drawText(text, {
      x: rx + padX,
      y: baselineY,
      size,
      font,
      color: PDF_WHITE,
    });
  }

  drawTextLine(
    ctx: PdfDrawContext,
    margin: number,
    lineHeight: number,
    text: string,
    opt?: { x?: number; y?: number; size?: number; font?: PDFFont; color?: PdfRgb },
  ): PdfDrawContext {
    const size = opt?.size ?? 9;
    const font = opt?.font ?? this.fontNormal;
    const x = opt?.x ?? margin;
    const y = opt?.y ?? ctx.cursorY;
    const color = opt?.color ?? PDF_TEXT_DARK;
    ctx.page.drawText(text, { x, y, size, font, color });
    return { ...ctx, cursorY: y - lineHeight };
  }
}
