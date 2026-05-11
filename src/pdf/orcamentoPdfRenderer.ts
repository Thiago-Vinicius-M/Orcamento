import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { embedPdfFonts } from "./orcamentoPdfFontLoader";
import type { OrcamentoPdfViewModel } from "./orcamentoPdfPresenter";

interface DrawContext {
  page: PDFPage;
  cursorY: number;
}

/** * Paleta de Cores Profissional
 * PRIMARY: Azul Marinho Corporativo
 * ACCENT: Azul Vibrante para detalhes
 * NEUTRAL: Tons de cinza para texto e bordas
 */
const PRIMARY = rgb(0.06, 0.15, 0.28); // #102647
const ACCENT = rgb(0, 0.48, 1);        // #007BFF
const TEXT_DARK = rgb(0.13, 0.13, 0.13);
const TEXT_MEDIUM = rgb(0.4, 0.4, 0.4);
const BORDER = rgb(0.88, 0.90, 0.92);
const BG_LIGHT = rgb(0.97, 0.98, 0.99);
const WHITE = rgb(1, 1, 1);

const FOOTER_H = 50;
function contentMinY(margin: number): number {
  return margin + FOOTER_H + 15;
}

function wrapWordsToWidth(font: PDFFont, text: string, maxWidth: number, size: number): string[] {
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

function truncateToWidth(font: PDFFont, text: string, maxW: number, size: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  let s = text;
  while (s.length > 3 && font.widthOfTextAtSize(`${s.slice(0, -1)}…`, size) > maxW) {
    s = s.slice(0, -1);
  }
  return `${s.slice(0, -1)}…`;
}

function drawRight(
  page: PDFPage,
  text: string,
  xRight: number,
  y: number,
  size: number,
  font: PDFFont,
  color = TEXT_DARK
): void {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: xRight - w, y, size, font, color });
}

function drawCornerDecor(p: PDFPage, w: number, h: number): void {
  // Substituí as elipses por um detalhe linear mais moderno no topo
  p.drawRectangle({
    x: 0,
    y: h - 4,
    width: w,
    height: 4,
    color: ACCENT,
  });
  
  // Marca d'água sutil no fundo
  p.drawCircle({
    x: w,
    y: h,
    size: 180,
    color: PRIMARY,
    opacity: 0.03,
  });
}

function drawTotalPill(page: PDFPage, font: PDFFont, label: string, xRight: number, baselineY: number): void {
  const size = 12;
  const text = label.toUpperCase();
  const tw = font.widthOfTextAtSize(text, size);
  const padX = 18;
  const pillW = tw + padX * 2;
  const pillH = 32;
  const rx = xRight - pillW;
  const ry = baselineY - 10;

  // Retângulo arredondado (estilo botão moderno)
  page.drawRectangle({
    x: rx,
    y: ry,
    width: pillW,
    height: pillH,
    color: PRIMARY,
  });
  
  page.drawText(text, {
    x: rx + padX,
    y: baselineY,
    size,
    font,
    color: WHITE
  });
}

export async function renderizarOrcamentoPdf(model: OrcamentoPdfViewModel): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const { fontTitle, fontNormal } = await embedPdfFonts(pdfDoc);

  let page = pdfDoc.addPage();
  let { width, height } = page.getSize();
  const m = 48; // Margens levemente maiores para "respiro"
  const lh = 14;
  const gap = 20;
  const minY = () => contentMinY(m);

  const layout = () => {
    const contentW = width - 2 * m;
    const colValorW = 90;
    const colServW = 130;
    const colDescW = contentW - colServW - colValorW;
    return {
      contentW,
      colServW,
      colDescW,
      colValorW,
      xServ: m,
      xDesc: m + colServW,
      xValor: m + colServW + colDescW
    };
  };

  let L = layout();

  const drawText = (
    ctx: DrawContext,
    text: string,
    opt?: { x?: number; y?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> }
  ): DrawContext => {
    const size = opt?.size ?? 9;
    const font = opt?.font ?? fontNormal;
    const x = opt?.x ?? m;
    const y = opt?.y ?? ctx.cursorY;
    const color = opt?.color ?? TEXT_DARK;
    ctx.page.drawText(text, { x, y, size, font, color });
    return { ...ctx, cursorY: y - lh };
  };

  const newPage = (): DrawContext => {
    page = pdfDoc.addPage();
    ({ width, height } = page.getSize());
    L = layout();
    drawCornerDecor(page, width, height);
    return { page, cursorY: height - m };
  };

  const ensureSpace = (ctx: DrawContext, need: number): DrawContext => {
    if (ctx.cursorY - need >= minY()) return ctx;
    return newPage();
  };

  drawCornerDecor(page, width, height);

  const drawTableHeader = (ctx: DrawContext): DrawContext => {
    const h = 24;
    const yTop = ctx.cursorY;
    const yRect = yTop - h;
    const xLeft = m;
    const xRight = m + L.contentW;
    const headerBg = rgb(0.93, 0.94, 0.96); // mais contraste que BG_LIGHT
    const headerLine = rgb(0.80, 0.82, 0.86);

    // Cabeçalho minimalista sem bordas laterais
    ctx.page.drawRectangle({
      x: m,
      y: yRect,
      width: L.contentW,
      height: h,
      color: headerBg,
    });
    
    const ty = yRect + 7;
    ctx.page.drawText("PRODUTO", { x: L.xServ + 8, y: ty, size: 9, font: fontTitle, color: PRIMARY });
    ctx.page.drawText("DESCRIÇÃO DETALHADA", { x: L.xDesc + 8, y: ty, size: 9, font: fontTitle, color: PRIMARY });
    drawRight(ctx.page, "TOTAL", L.xValor + L.colValorW - 8, ty, 8.5, fontTitle, PRIMARY);

    // Grade: borda externa + divisórias verticais (PRODUTO | DESCRIÇÃO | TOTAL)
    ctx.page.drawLine({ start: { x: xLeft, y: yRect }, end: { x: xRight, y: yRect }, color: headerLine, thickness: 0.8 });
    ctx.page.drawLine({ start: { x: xLeft, y: yTop }, end: { x: xRight, y: yTop }, color: headerLine, thickness: 0.8 });
    ctx.page.drawLine({ start: { x: xLeft, y: yRect }, end: { x: xLeft, y: yTop }, color: headerLine, thickness: 0.8 });
    ctx.page.drawLine({ start: { x: xRight, y: yRect }, end: { x: xRight, y: yTop }, color: headerLine, thickness: 0.8 });
    ctx.page.drawLine({ start: { x: L.xDesc, y: yRect }, end: { x: L.xDesc, y: yTop }, color: headerLine, thickness: 0.8 });
    ctx.page.drawLine({ start: { x: L.xValor, y: yRect }, end: { x: L.xValor, y: yTop }, color: headerLine, thickness: 0.8 });
    
    return { ...ctx, cursorY: yRect - 8 };
  };

  const drawHeader = (ctx: DrawContext): DrawContext => {
    const top = height - m;
    
    // Nome da Empresa com linha de destaque lateral
    ctx.page.drawLine({
        start: { x: m, y: top },
        end: { x: m, y: top - 45 },
        color: ACCENT,
        thickness: 3
    });

    ctx.page.drawText(model.empresaNome.toUpperCase(), {
      x: m + 12,
      y: top - 12,
      size: 11,
      font: fontTitle,
      color: TEXT_MEDIUM
    });

    const num = model.orcamentoNumero.replace(/^Nº\s*/i, "#");
    ctx.page.drawText(`${model.tituloDocumento.toUpperCase()} ${num}`, {
      x: m + 12,
      y: top - 35,
      size: 10,
      font: fontTitle,
      color: PRIMARY
    });

    // Data alinhada à direita do título
    drawRight(ctx.page, `Emitido em: ${model.dataEmissao}`, width - m, top - 32, 9, fontNormal, TEXT_MEDIUM);
    drawRight(ctx.page, `Válido até: ${model.dataValidade}`, width - m, top - 46, 9, fontNormal, TEXT_MEDIUM);
    if (model.geradoPorLinha) {
      const maxGeradoW = Math.max(100, width - 2 * m - 200);
      const linhaGerado = truncateToWidth(fontNormal, model.geradoPorLinha, maxGeradoW, 9);
      drawRight(ctx.page, linhaGerado, width - m, top - 60, 9, fontNormal, TEXT_MEDIUM);
    }

    // Bloco do Cliente (A/C)
    let yc = top - 85;
    ctx.page.drawText("CLIENTE", { x: m, y: yc, size: 8, font: fontTitle, color: ACCENT });
    yc -= 16;
    for (const line of model.clienteLinhas) {
      ctx.page.drawText(line, { x: m, y: yc, size: 10, font: fontNormal, color: TEXT_DARK });
      yc -= 13;
    }

    return { ...ctx, cursorY: yc - gap };
  };

  let ctx: DrawContext = { page, cursorY: height - m };
  ctx = drawHeader(ctx);
  ctx = drawTableHeader(ctx);

  const itemSize = 9.5;
  const descSize = 8.5;
  const itemLh = 12;

  for (const item of model.itens) {
    const servText = truncateToWidth(fontTitle, item.descricao, L.colServW - 15, itemSize);
    const descLines = [
      `Qtd: ${item.quantidade} | Unit: ${item.precoUnitario}`,
      ...wrapWordsToWidth(fontNormal, item.descricao, L.colDescW - 16, descSize)
    ];

    const descH = descLines.length * itemLh;
    const rowH = Math.max(24, descH + 12);

    if (ctx.cursorY - rowH < minY()) {
      ctx = newPage();
      ctx = drawTableHeader(ctx);
    }

    const baseY = ctx.cursorY;
    const rowBottom = baseY - rowH;
    const xLeft = m;
    const xRight = m + L.contentW;

    // Linha divisória sutil inferior apenas
    ctx.page.drawLine({
      start: { x: m, y: rowBottom },
      end: { x: width - m, y: rowBottom },
      color: BORDER,
      thickness: 0.5
    });

    // Coluna de Valor com fundo sutil
    ctx.page.drawRectangle({
      x: L.xValor,
      y: rowBottom + 0.5,
      width: L.colValorW,
      height: rowH - 0.5,
      color: BG_LIGHT,
    });

    // Grade: borda externa + divisórias verticais (mantém TOTAL à direita)
    ctx.page.drawLine({ start: { x: xLeft, y: rowBottom }, end: { x: xLeft, y: baseY }, color: BORDER, thickness: 0.6 });
    ctx.page.drawLine({ start: { x: xRight, y: rowBottom }, end: { x: xRight, y: baseY }, color: BORDER, thickness: 0.6 });
    ctx.page.drawLine({ start: { x: L.xDesc, y: rowBottom }, end: { x: L.xDesc, y: baseY }, color: BORDER, thickness: 0.6 });
    ctx.page.drawLine({ start: { x: L.xValor, y: rowBottom }, end: { x: L.xValor, y: baseY }, color: BORDER, thickness: 0.6 });

    ctx.page.drawText(servText, {
      x: L.xServ + 8,
      y: baseY - 15,
      size: itemSize,
      font: fontTitle,
      color: PRIMARY
    });

    let dy = baseY - 15;
    for (let i = 0; i < descLines.length; i++) {
      const color = i === 0 ? ACCENT : TEXT_MEDIUM;
      const font = i === 0 ? fontTitle : fontNormal;
      ctx.page.drawText(descLines[i], { x: L.xDesc + 8, y: dy, size: descSize, font, color });
      dy -= itemLh;
    }

    drawRight(ctx.page, item.subtotal, L.xValor + L.colValorW - 8, baseY - 15, 10, fontTitle, PRIMARY);

    ctx = { ...ctx, cursorY: rowBottom - 5 };
  }

  // Seção de Total (resumo financeiro + total em destaque)
  ctx = { ...ctx, cursorY: ctx.cursorY - 20 };
  ctx = ensureSpace(ctx, 150);

  const xResumoDir = width - m;
  const gapResumo = 4;
  const maxRotuloW = L.contentW - 140;
  let yResumo = ctx.cursorY;

  ctx.page.drawText("Subtotal", {
    x: m,
    y: yResumo,
    size: 8.5,
    font: fontNormal,
    color: TEXT_MEDIUM
  });
  drawRight(ctx.page, model.totais.subtotal, xResumoDir, yResumo, 8.5, fontNormal, TEXT_MEDIUM);
  yResumo -= lh + gapResumo;

  if (model.totais.mostrarDesconto) {
    const rotuloDesc = truncateToWidth(
      fontTitle,
      model.totais.rotuloDesconto,
      maxRotuloW,
      9.5
    );
    ctx.page.drawText(rotuloDesc, {
      x: m,
      y: yResumo,
      size: 9.5,
      font: fontTitle,
      color: ACCENT
    });
    drawRight(
      ctx.page,
      model.totais.descontoValorDisplay,
      xResumoDir,
      yResumo,
      9.5,
      fontTitle,
      ACCENT
    );
    yResumo -= lh + gapResumo;
  }

  if (model.totais.mostrarTaxa) {
    const rotuloTaxa = truncateToWidth(fontNormal, model.totais.rotuloTaxa, maxRotuloW, 9);
    ctx.page.drawText(rotuloTaxa, {
      x: m,
      y: yResumo,
      size: 9,
      font: fontNormal,
      color: TEXT_DARK
    });
    drawRight(ctx.page, model.totais.taxas, xResumoDir, yResumo, 9, fontNormal, TEXT_DARK);
    yResumo -= lh + gapResumo;
  }

  ctx = { ...ctx, cursorY: yResumo - 8 };
  drawTotalPill(ctx.page, fontTitle, `TOTAL: ${model.totais.total}`, width - m, ctx.cursorY);

  ctx = { ...ctx, cursorY: ctx.cursorY - 50 };

  // Observações com estilo de "Callout"
  if (model.observacoes) {
    ctx = ensureSpace(ctx, 60);
    ctx.page.drawText("NOTAS ADICIONAIS", { x: m, y: ctx.cursorY, size: 8, font: fontTitle, color: ACCENT });
    ctx = { ...ctx, cursorY: ctx.cursorY - 14 };
    for (const line of wrapWordsToWidth(fontNormal, model.observacoes, L.contentW, 9)) {
      ctx = ensureSpace(ctx, 12);
      ctx = drawText(ctx, line, { size: 9, color: TEXT_MEDIUM });
    }
    ctx = { ...ctx, cursorY: ctx.cursorY - 15 };
  }

  // Rodapé Informativo (Pagamento e Termos)
  ctx = ensureSpace(ctx, 140);
  const footerTop = ctx.cursorY;
  ctx.page.drawLine({
    start: { x: m, y: footerTop },
    end: { x: m + 30, y: footerTop },
    color: ACCENT,
    thickness: 2
  });
  
  ctx = { ...ctx, cursorY: footerTop - 15 };
  const rightX = m + L.contentW * 0.52;
  const sectionY = ctx.cursorY;

  // Coluna Esquerda: Pagamento
  ctx.page.drawText("PAGAMENTO", { x: m, y: sectionY, size: 8, font: fontTitle, color: PRIMARY });
  let py = sectionY - 14;
  const payLines = model.pagamentoResumo.split(" | ").map(s => s.trim());
  for (const ln of payLines) {
    ctx.page.drawText(ln, { x: m, y: py, size: 8.5, font: fontNormal, color: TEXT_DARK });
    py -= 11;
  }

  // Coluna Direita: Contato
  let ry = sectionY;
  ctx.page.drawText("CONTATO", { x: rightX, y: ry, size: 8, font: fontTitle, color: PRIMARY });
  ry -= 14;
  const contactParts = model.rodape.contato ? model.rodape.contato.split(" | ") : [];
  for (const part of contactParts) {
    ctx.page.drawText(part, { x: rightX, y: ry, size: 8.5, font: fontNormal, color: TEXT_DARK });
    ry -= 11;
  }

  // Termos e Validade centralizados ou abaixo
  ctx.cursorY = Math.min(py, ry) - 20;
  ctx.page.drawText("VALIDADE E CONDIÇÕES", { x: m, y: ctx.cursorY, size: 8, font: fontTitle, color: PRIMARY });
  ctx.cursorY -= 12;
  const termos = `${model.avisoValidade}. ${model.termosCondicoes}`;
  for (const line of wrapWordsToWidth(fontNormal, termos, L.contentW, 7.5)) {
    ctx = drawText(ctx, line, { size: 7.5, color: TEXT_MEDIUM });
  }

  drawPageFooters(pdfDoc, fontNormal, m);

  return pdfDoc.save();
}

function drawPageFooters(pdfDoc: PDFDocument, font: PDFFont, margin: number): void {
  const pages = pdfDoc.getPages();
  const n = pages.length;
  for (let i = 0; i < n; i++) {
    const p = pages[i]!;
    const { width } = p.getSize();
    
    const s = 7;
    const pg = `Página ${i + 1} de ${n}`;
    const pw = font.widthOfTextAtSize(pg, s);
    
    p.drawText(pg, { 
        x: (width / 2) - (pw / 2), 
        y: margin - 20, 
        size: s, 
        font, 
        color: TEXT_MEDIUM 
    });
  }
}