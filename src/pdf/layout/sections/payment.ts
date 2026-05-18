import type { PDFFont, PDFPage } from "pdf-lib";
import type { OrcamentoPdfViewModel, PagamentoDetalheViewModel } from "../../orcamentoPdfPresenter";
import type { PdfDrawContext, PdfRgb } from "../../pdfTypes";
import { PDF_BG_LIGHT, PDF_BORDER, PDF_PRIMARY, PDF_TEXT_DARK, PDF_TEXT_MEDIUM, PDF_WHITE, PdfPainter } from "../../PdfPainter";
import type { PdfPageContext } from "../../PdfPageContext";
import { computeOrcamentoPdfTableLayout } from "../orcamentoPdfTableLayout";

// ─── Helpers de desenho ──────────────────────────────────────────────────────

function drawSectionHeader(
  page: PDFPage,
  x: number,
  y: number,
  label: string,
  contentW: number,
  fontTitle: PDFFont,
): void {
  page.drawText(label, { x, y, size: 9, font: fontTitle, color: PDF_PRIMARY });
  page.drawLine({
    start: { x, y: y - 15 },
    end: { x: x + contentW, y: y - 15 },
    color: PDF_BORDER,
    thickness: 0.4,
  });
}

function drawCreditoCard(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  painter: PdfPainter,
  fonts: { fontTitle: PDFFont; fontNormal: PDFFont },
  data: { parcelamentoTexto: string; valorTotal: string; numParcelasTexto: string; valorParcelaTexto: string },
): number {
  const { fontTitle, fontNormal } = fonts;
  const cardH = 88;
  const padX = 8;

  painter.drawRect(page, { x, y: y - cardH, width, height: cardH, color: PDF_BG_LIGHT, borderColor: PDF_BORDER, borderWidth: 0.5 });

  page.drawText("Cartão de Crédito", { x: x + padX, y: y - 13, size: 9, font: fontTitle, color: PDF_TEXT_DARK });

  page.drawLine({
    start: { x, y: y - 22 },
    end: { x: x + width, y: y - 22 },
    color: PDF_BORDER,
    thickness: 0.4,
  });

  const colEsqW = Math.floor(width * 0.46);
  page.drawText("Parcelamento", { x: x + padX, y: y - 33, size: 7, font: fontNormal, color: PDF_TEXT_MEDIUM });
  page.drawText(data.parcelamentoTexto, { x: x + padX, y: y - 48, size: 14, font: fontTitle, color: PDF_PRIMARY });

  const colDirX = x + colEsqW + padX;
  const colDirW = width - colEsqW - padX;
  const detalheRows: [string, string][] = [
    ["Valor total", data.valorTotal],
    ["Número de parcelas", data.numParcelasTexto],
    ["Valor por parcela (est.)", data.valorParcelaTexto],
    ["Forma de cobrança", "Cartão de Crédito"],
  ];
  let ry = y - 33;
  for (const [rotulo, valor] of detalheRows) {
    page.drawText(rotulo, { x: colDirX, y: ry, size: 6.5, font: fontNormal, color: PDF_TEXT_MEDIUM });
    painter.drawRight(page, valor, colDirX + colDirW - padX, ry, 7, fontTitle, PDF_TEXT_DARK);
    ry -= 13;
  }

  return cardH;
}

function drawBoletoHeader(
  page: PDFPage,
  x: number,
  y: number,
  fontTitle: PDFFont,
): void {
  const bx = x + 8;
  page.drawRectangle({ x: bx,      y: y - 11, width: 2, height: 10, color: PDF_TEXT_DARK });
  page.drawRectangle({ x: bx + 4,  y: y - 11, width: 4, height: 10, color: PDF_TEXT_DARK });
  page.drawRectangle({ x: bx + 10, y: y - 11, width: 2, height: 10, color: PDF_TEXT_DARK });
  page.drawText("Boleto Bancário", { x: bx + 16, y: y - 11, size: 9, font: fontTitle, color: PDF_TEXT_DARK });
}

// Chips renderizados em largura total (contentW) para boa leitura
function drawBoletoChips(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  painter: PdfPainter,
  fonts: { fontTitle: PDFFont; fontNormal: PDFFont },
  data: { primVencTexto: string; intervaloTexto: string; numParcelasTexto: string; valorParcelaTexto: string },
): number {
  const { fontTitle, fontNormal } = fonts;
  const chipH = 38;
  const gap = 6;
  const numChips = 4;
  const chipW = Math.floor((width - gap * (numChips - 1)) / numChips);

  const chips: [string, string][] = [
    ["1º Vencimento", data.primVencTexto],
    ["Intervalo", data.intervaloTexto],
    ["Qtd. Parcelas", data.numParcelasTexto],
    ["Valor por Parcela", data.valorParcelaTexto],
  ];

  for (let i = 0; i < chips.length; i++) {
    const cx = x + i * (chipW + gap);
    const [label, valor] = chips[i]!;

    painter.drawRect(page, { x: cx, y: y - chipH, width: chipW, height: chipH, color: PDF_BG_LIGHT, borderColor: PDF_BORDER, borderWidth: 0.4 });

    page.drawText(label, { x: cx + 6, y: y - 13, size: 6, font: fontNormal, color: PDF_TEXT_MEDIUM });
    const maxValorW = chipW - 12;
    const valorExibido = painter.truncateToWidth(fontTitle, valor, maxValorW, 9);
    page.drawText(valorExibido, { x: cx + 6, y: y - 27, size: 9, font: fontTitle, color: PDF_PRIMARY });
  }

  return chipH;
}

function drawTabelaBoleto(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  painter: PdfPainter,
  fonts: { fontTitle: PDFFont; fontNormal: PDFFont },
  parcelas: Array<{ numero: number; data: string; valor: string }>,
): number {
  const { fontTitle, fontNormal } = fonts;
  const colParcela = Math.floor(width * 0.14);
  const rowH = 16;
  const headerH = 18;

  painter.drawRect(page, { x, y: y - headerH, width, height: headerH, color: PDF_PRIMARY });
  page.drawText("Parcela",    { x: x + 5,              y: y - 12, size: 7.5, font: fontTitle, color: PDF_WHITE });
  page.drawText("Vencimento", { x: x + colParcela + 5, y: y - 12, size: 7.5, font: fontTitle, color: PDF_WHITE });
  painter.drawRight(page, "Valor", x + width - 5, y - 12, 7.5, fontTitle, PDF_WHITE);

  let py = y - headerH;

  for (let i = 0; i < parcelas.length; i++) {
    const p = parcelas[i]!;
    const rowBg = i % 2 === 0 ? PDF_BG_LIGHT : PDF_WHITE;
    painter.drawRect(page, { x, y: py - rowH, width, height: rowH, color: rowBg, borderColor: PDF_BORDER, borderWidth: 0.3 });
    const textY = py - 11;
    page.drawText(`${p.numero}.`, { x: x + 5,              y: textY, size: 7.5, font: fontNormal, color: PDF_TEXT_DARK });
    page.drawText(p.data,         { x: x + colParcela + 5, y: textY, size: 7.5, font: fontNormal, color: PDF_TEXT_DARK });
    painter.drawRight(page, p.valor, x + width - 5, textY, 7.5, fontNormal, PDF_TEXT_DARK);
    py -= rowH;
  }

  return headerH + parcelas.length * rowH + 4;
}

function drawAvisoDiscrete(
  page: PDFPage,
  x: number,
  y: number,
  maxWidth: number,
  texto: string,
  painter: PdfPainter,
  fontNormal: PDFFont,
): number {
  const linhas = painter.wrapWordsToWidth(fontNormal, texto, maxWidth, 7);
  let ly = y;
  for (const linha of linhas) {
    page.drawText(linha, { x, y: ly, size: 7, font: fontNormal, color: PDF_TEXT_MEDIUM });
    ly -= 10;
  }
  return linhas.length * 10 + 4;
}

function drawResumoBox(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  painter: PdfPainter,
  fonts: { fontTitle: PDFFont; fontNormal: PDFFont },
  rows: Array<{ rotulo: string; valor: string; destaque?: boolean }>,
): number {
  const { fontTitle, fontNormal } = fonts;
  const padX = 8;
  const rowH = 16;
  const titleH = 22;
  const boxH = titleH + rows.length * rowH + 6;

  painter.drawRect(page, { x, y: y - boxH, width, height: boxH, color: PDF_BG_LIGHT, borderColor: PDF_BORDER, borderWidth: 0.5 });

  page.drawText("Resumo do pagamento", { x: x + padX, y: y - 13, size: 8, font: fontTitle, color: PDF_TEXT_DARK });
  page.drawLine({ start: { x, y: y - titleH }, end: { x: x + width, y: y - titleH }, color: PDF_BORDER, thickness: 0.4 });

  let ry = y - titleH - rowH + 5;
  for (const row of rows) {
    if (row.destaque) {
      painter.drawRect(page, { x, y: ry - 5, width, height: rowH, color: PDF_PRIMARY });
      page.drawText(row.rotulo, { x: x + padX, y: ry + 2, size: 7.5, font: fontTitle, color: PDF_WHITE });
      painter.drawRight(page, row.valor, x + width - padX, ry + 2, 8, fontTitle, PDF_WHITE);
    } else {
      page.drawText(row.rotulo, { x: x + padX, y: ry + 2, size: 7.5, font: fontNormal, color: PDF_TEXT_MEDIUM });
      painter.drawRight(page, row.valor, x + width - padX, ry + 2, 8, fontTitle, PDF_TEXT_DARK);
    }
    ry -= rowH;
  }

  return boxH;
}

// ─── Estimativa de altura ────────────────────────────────────────────────────

function estimarAlturaPayment(model: OrcamentoPdfViewModel): number {
  const isBoleto = model.pagamentoDetalhes.some(d => d.tipo === "boleto-chips");

  let contentH = 18; // section header
  for (const d of model.pagamentoDetalhes) {
    if      (d.tipo === "credito-card")   contentH += 96;
    else if (d.tipo === "boleto-chips")   contentH += 62;  // 20 header + 38 chips + 4 gap
    else if (d.tipo === "tabela-boleto")  contentH += 18 + d.parcelas.length * 16 + 10;
    else if (d.tipo === "aviso")          contentH += 30;
    else if (d.tipo === "titulo")         contentH += 22;
    else if (d.tipo === "linha")          contentH += 14;
    else if (d.tipo === "resumo")         contentH += 26;
  }

  if (isBoleto) {
    const resumoH = model.pagamentoResumoBox
      ? 22 + model.pagamentoResumoBox.length * 16 + 6
      : 0;
    const twoColH = Math.max(contentH - 80, resumoH);
    return 80 + twoColH + 40;
  }

  return contentH + 40;
}

// ─── Função principal ────────────────────────────────────────────────────────

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

  const need = estimarAlturaPayment(model);
  let c = ensureSpace(ctx, need);

  const L = computeOrcamentoPdfTableLayout(pageCtx.width, margin);

  const isBoleto = model.pagamentoDetalhes.some(d => d.tipo === "boleto-chips");

  // Para boleto: tabela usa 60% da largura; para outros: coluna única
  const leftW  = Math.floor(L.contentW * (isBoleto ? 0.60 : 1.0));
  const rightX = margin + leftW + 10;
  const rightW = L.contentW - leftW - 10;

  const sectionY = c.cursorY;

  // ── Cabeçalho da seção ────────────────────────────────────────────────────
  drawSectionHeader(c.page, margin, sectionY, "PAGAMENTO", L.contentW, fontTitle);
  let py = sectionY - 20;

  // Posição de início da coluna direita (definida após chips para boleto)
  let rightColStartY = sectionY;

  // ── Coluna esquerda: detalhes de pagamento ────────────────────────────────
  for (const detalhe of model.pagamentoDetalhes) {
    if (detalhe.tipo === "credito-card") {
      const h = drawCreditoCard(c.page, margin, py, leftW, painter, { fontTitle, fontNormal }, detalhe);
      py -= h + 8;

    } else if (detalhe.tipo === "boleto-chips") {
      drawBoletoHeader(c.page, margin, py, fontTitle);
      py -= 20;
      // Chips sempre em largura total para garantir legibilidade
      const h = drawBoletoChips(c.page, margin, py, L.contentW, painter, { fontTitle, fontNormal }, detalhe);
      py -= h + 10;
      rightColStartY = py; // coluna direita começa abaixo dos chips

    } else if (detalhe.tipo === "tabela-boleto") {
      const h = drawTabelaBoleto(c.page, margin, py, leftW, painter, { fontTitle, fontNormal }, detalhe.parcelas);
      py -= h + 6;

    } else if (detalhe.tipo === "aviso") {
      const avisoW = isBoleto ? leftW - 8 : L.contentW - 8;
      const h = drawAvisoDiscrete(c.page, margin, py, avisoW, detalhe.texto, painter, fontNormal);
      py -= h + 6;

    } else if (detalhe.tipo === "titulo") {
      c.page.drawText(detalhe.texto, { x: margin, y: py, size: 9.5, font: fontTitle, color: PDF_PRIMARY });
      py -= 14;

    } else if (detalhe.tipo === "linha") {
      const rotuloTexto = `${(detalhe as Extract<PagamentoDetalheViewModel, { tipo: "linha" }>).rotulo}: `;
      const rotuloW = fontNormal.widthOfTextAtSize(rotuloTexto, 8.5);
      c.page.drawText(rotuloTexto, { x: margin, y: py, size: 8.5, font: fontNormal, color: PDF_TEXT_MEDIUM });
      c.page.drawText((detalhe as Extract<PagamentoDetalheViewModel, { tipo: "linha" }>).valor, { x: margin + rotuloW, y: py, size: 8.5, font: fontNormal, color: PDF_TEXT_DARK });
      py -= 13;

    } else if (detalhe.tipo === "resumo") {
      const pillText = (detalhe as Extract<PagamentoDetalheViewModel, { tipo: "resumo" }>).texto;
      const pillSize = 9;
      const padX = 10;
      const padY = 5;
      const textW = fontTitle.widthOfTextAtSize(pillText, pillSize);
      const pillW = textW + padX * 2;
      const pillH = pillSize + padY * 2;
      painter.drawRect(c.page, { x: margin, y: py - padY, width: pillW, height: pillH, color: PDF_PRIMARY });
      c.page.drawText(pillText, { x: margin + padX, y: py, size: pillSize, font: fontTitle, color: PDF_WHITE });
      py -= pillH + 8;
    }
  }

  // ── Coluna direita: resumo de pagamento (apenas para boleto) ──────────────
  let ry = rightColStartY;

  if (isBoleto && model.pagamentoResumoBox && model.pagamentoResumoBox.length > 0) {
    const boxH = drawResumoBox(c.page, rightX, ry, rightW, painter, { fontTitle, fontNormal }, model.pagamentoResumoBox);
    ry -= boxH;
  }

  // ── Cursor final ──────────────────────────────────────────────────────────
  c = { ...c, cursorY: Math.min(py, ry) - 20 };

  // ── VALIDADE E CONDIÇÕES ──────────────────────────────────────────────────
  c.page.drawText("VALIDADE E CONDIÇÕES", { x: margin, y: c.cursorY, size: 8, font: fontTitle, color: PDF_PRIMARY });
  c = { ...c, cursorY: c.cursorY - 12 };
  const termos = `${model.avisoValidade}. ${model.termosCondicoes}`;
  for (const line of painter.wrapWordsToWidth(fontNormal, termos, L.contentW, 7.5)) {
    c = drawTextLine(c, line, { size: 7.5, color: PDF_TEXT_MEDIUM });
  }

  return c;
}
