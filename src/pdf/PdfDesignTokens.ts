/**
 * Design tokens centralizados para o PDF do orçamento.
 *
 * Nenhum arquivo de renderização deve hardcodar cores, tamanhos ou espaçamentos.
 * Todas as constantes visuais devem vir daqui.
 */
import { rgb } from "pdf-lib";

// ─── Paleta de cores ──────────────────────────────────────────────────────────

export const PDF_COLORS = {
  PRIMARY:     rgb(0.06, 0.15, 0.28),   // Azul escuro — cabeçalhos, títulos de seção
  ACCENT:      rgb(0, 0.48, 1),          // Azul vivo — destaques, ícones
  TEXT_DARK:   rgb(0.13, 0.13, 0.13),   // Quase preto — texto principal
  TEXT_MEDIUM: rgb(0.4, 0.4, 0.4),      // Cinza médio — texto secundário
  BORDER:      rgb(0.88, 0.9, 0.92),    // Cinza claro — bordas e divisórias
  BG_LIGHT:    rgb(0.97, 0.98, 0.99),   // Quase branco — fundo de linhas alternadas
  WHITE:       rgb(1, 1, 1),             // Branco puro — textos sobre fundo escuro
} as const;

// ─── Espaçamentos ─────────────────────────────────────────────────────────────

export const PDF_SPACING = {
  MARGIN:           48,   // Margem da página
  LINE_HEIGHT:      14,   // Altura de linha padrão
  SECTION_GAP:      20,   // Espaço entre seções
  SECTION_HEADER_H: 18,   // Altura reservada para cabeçalho de seção (título + linha)
  ROW_HEIGHT:       16,   // Altura de linha de tabela padrão
  HEADER_ROW_H:     18,   // Altura de linha de cabeçalho de tabela
  CHIP_HEIGHT:      38,   // Altura de chip de informação (boleto)
  CARD_HEIGHT:      88,   // Altura do card de crédito
} as const;

// ─── Tipografia ───────────────────────────────────────────────────────────────

export const PDF_FONT_SIZES = {
  COMPANY_NAME:    11,    // Nome da empresa no cabeçalho
  DOC_TITLE:       10,    // Título do documento (ORÇAMENTO #XXXX)
  SECTION_TITLE:    9,    // Cabeçalho de seção
  ITEM_NAME:        9.5,  // Nome do produto
  BODY:             8.5,  // Texto padrão
  SMALL:            7.5,  // Texto de tabela
  TINY:             7,    // Texto de aviso/nota
  FOOTER:           7,    // Rodapé de página
} as const;

// ─── Bordas ───────────────────────────────────────────────────────────────────

export const PDF_BORDER_WIDTHS = {
  HEADER_ACCENT:  3,    // Barra de acento do cabeçalho (azul vivo)
  SECTION_DIVIDER: 0.4, // Linha divisória de seção
  TABLE_HEADER:   0.8,  // Borda de cabeçalho de tabela
  TABLE_ROW:      0.5,  // Borda de linha de tabela
  CARD:           0.5,  // Borda de card
  CHIP:           0.4,  // Borda de chip
} as const;
