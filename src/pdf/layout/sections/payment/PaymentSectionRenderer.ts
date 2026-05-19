import type { PDFFont } from "pdf-lib";
import type { OrcamentoPdfViewModel, PagamentoDetalheViewModel } from "../../../orcamentoPdfPresenter";
import type { PdfDrawContext, PdfRgb } from "../../../pdfTypes";
import { PDF_BORDER, PDF_PRIMARY, PDF_TEXT_MEDIUM, PdfPainter } from "../../../PdfPainter";
import type { PdfPageContext } from "../../../PdfPageContext";
import { computeOrcamentoPdfTableLayout } from "../../orcamentoPdfTableLayout";
import { estimarAlturaPayment } from "./PaymentHeightEstimator";
import {
  renderSimples,
  renderCreditoCard,
  renderBoletoHeader,
  renderBoletoChips,
  renderTabelaBoleto,
  renderResumoBox,
  renderFinanciamentoTitulo,
  renderFinanciamentoLinha,
  renderFinanciamentoPill,
  renderAviso,
} from "./renderers/index";

// ─── Cabeçalho de seção ──────────────────────────────────────────────────────

function drawSectionHeader(
  page: Parameters<typeof renderSimples>[0],
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

// ─── Função principal exportada ───────────────────────────────────────────────

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
  const isBoleto = model.pagamentoDetalhes.some((d) => d.tipo === "boleto-chips");

  // Para boleto: 60% esquerdo para tabela, 40% direito para resumo.
  // Para outros tipos: coluna única de 100%.
  const leftW  = Math.floor(L.contentW * (isBoleto ? 0.60 : 1.0));
  const rightX = margin + leftW + 10;
  const rightW = L.contentW - leftW - 10;

  const sectionY = c.cursorY;

  // Cabeçalho "PAGAMENTO" com linha divisória
  drawSectionHeader(c.page, margin, sectionY, "PAGAMENTO", L.contentW, fontTitle);
  let py = sectionY - 20;

  // Para boleto: rightColStartY é atualizado após os chips.
  // Para outros tipos: inicia igual a py para que Math.min(py, ry) seja correto.
  let rightColStartY = py;

  // ── Renderização de cada detalhe ─────────────────────────────────────────
  for (const detalhe of model.pagamentoDetalhes) {
    py = renderDetalhe(c.page, margin, py, leftW, isBoleto, L.contentW, detalhe, painter, { fontTitle, fontNormal });

    if (detalhe.tipo === "boleto-chips") {
      rightColStartY = py;
    }
  }

  // ── Coluna direita: caixa de resumo (apenas para boleto) ──────────────────
  let ry = rightColStartY;
  if (isBoleto && model.pagamentoResumoBox && model.pagamentoResumoBox.length > 0) {
    const boxH = renderResumoBox(c.page, rightX, ry, rightW, painter, { fontTitle, fontNormal }, model.pagamentoResumoBox);
    ry -= boxH;
  }

  // ── Cursor final: mínimo entre coluna esquerda e direita ──────────────────
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

// ─── Despacho por tipo de detalhe ─────────────────────────────────────────────

function renderDetalhe(
  page: Parameters<typeof renderSimples>[0],
  margin: number,
  py: number,
  leftW: number,
  isBoleto: boolean,
  contentW: number,
  detalhe: PagamentoDetalheViewModel,
  painter: PdfPainter,
  fonts: { fontTitle: PDFFont; fontNormal: PDFFont },
): number {
  const { fontTitle, fontNormal } = fonts;

  if (detalhe.tipo === "credito-card") {
    const h = renderCreditoCard(page, margin, py, leftW, painter, { fontTitle, fontNormal }, detalhe);
    return py - h - 8;
  }

  if (detalhe.tipo === "boleto-chips") {
    renderBoletoHeader(page, margin, py, fontTitle);
    py -= 20;
    // Chips sempre em largura total para legibilidade
    const h = renderBoletoChips(page, margin, py, contentW, painter, { fontTitle, fontNormal }, detalhe);
    return py - h - 10;
  }

  if (detalhe.tipo === "tabela-boleto") {
    const h = renderTabelaBoleto(page, margin, py, leftW, painter, { fontTitle, fontNormal }, detalhe.parcelas);
    return py - h - 6;
  }

  if (detalhe.tipo === "aviso") {
    const avisoW = isBoleto ? leftW - 8 : contentW - 8;
    const h = renderAviso(page, margin, py, avisoW, detalhe.texto, painter, fontNormal);
    return py - h - 6;
  }

  if (detalhe.tipo === "titulo") {
    renderFinanciamentoTitulo(page, margin, py, detalhe.texto, fontTitle);
    return py - 14;
  }

  if (detalhe.tipo === "linha") {
    const h = renderFinanciamentoLinha(page, margin, py, detalhe.rotulo, detalhe.valor, { fontTitle, fontNormal });
    return py - h;
  }

  if (detalhe.tipo === "resumo") {
    const h = renderFinanciamentoPill(page, margin, py, detalhe.texto, painter, fontTitle);
    return py - h;
  }

  return py;
}
