import { z } from 'zod'

/** Saída canônica do mapeamento de pagamento para a tela de detalhe (espelha `OrcamentoPagamentoDetalhe`). */
type PagamentoDetalheMapped = {
  tipo: string
  valor_entrada: number | null
  num_parcelas: number | null
  taxa_servico_percentual: number | null
  aplicar_taxa: boolean
  primeiro_vencimento: string | null
  intervalo_dias: number | null
}

/** Linha de pagamento vindas do Supabase (campos opcionais; permite chaves extras). */
export const PagamentoRowSchema = z
  .object({
    tipo: z.unknown().optional(),
    valor_entrada: z.unknown().optional(),
    num_parcelas: z.unknown().optional(),
    taxa_servico_percentual: z.unknown().optional(),
    aplicar_taxa: z.unknown().optional(),
    primeiro_vencimento: z.unknown().optional(),
    intervalo_dias: z.unknown().optional(),
  })
  .passthrough()

/** Forma canônica da linha `pagamento` usada no fluxo PDF (espelha `OrcamentoPdfPagamentoRow` no repositório). */
export type MappedPdfPagamentoRow = {
  tipo: string
  valor_entrada: number | null
  num_parcelas: number | null
  taxa_servico_percentual: number | null
  aplicar_taxa: boolean
  primeiro_vencimento: string | null
  intervalo_dias: number | null
}

/** Valida objeto "registro"; retorna o mesmo objeto tipado como record. */
export function parsePagamentoRowRecord(row: Record<string, unknown>): z.infer<typeof PagamentoRowSchema> {
  return PagamentoRowSchema.parse(row)
}

export function getNestedRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null
  }
  if (Array.isArray(value)) {
    const first = value[0]
    return first && typeof first === 'object' ? (first as Record<string, unknown>) : null
  }
  return typeof value === 'object' ? (value as Record<string, unknown>) : null
}

const NormalizeCreatedByUserIdSchema = z.unknown().transform((value): string | null => {
  if (value === null || value === undefined) {
    return null
  }
  const text = String(value).trim()
  return text === '' ? null : text
})

const NormalizeCreatedByNameSchema = z.unknown().transform((value): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
})

export function normalizeCreatedByUserId(value: unknown): string | null {
  return NormalizeCreatedByUserIdSchema.parse(value)
}

export function normalizeCreatedByName(value: unknown): string | null {
  return NormalizeCreatedByNameSchema.parse(value)
}

function numeroNullablePdf(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }
  return Number(value)
}

function numeroNullableDetalhe(value: unknown): number | null {
  if (value === null) {
    return null
  }
  return Number(value ?? 0)
}

function stringNullable(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

/**
 * Alinhado ao fluxo PDF: null/undefined em campos numéricos opcionais → null.
 */
export function mapPdfPagamentoRow(row: Record<string, unknown> | null): MappedPdfPagamentoRow | null {
  if (!row) {
    return null
  }
  parsePagamentoRowRecord(row)

  return {
    tipo: String(row.tipo ?? ''),
    valor_entrada: numeroNullablePdf(row.valor_entrada),
    num_parcelas: numeroNullablePdf(row.num_parcelas),
    taxa_servico_percentual: numeroNullablePdf(row.taxa_servico_percentual),
    aplicar_taxa: Boolean(row.aplicar_taxa),
    primeiro_vencimento: stringNullable(row.primeiro_vencimento),
    intervalo_dias: row.intervalo_dias != null ? numeroNullablePdf(row.intervalo_dias) : null,
  }
}

/**
 * Alinhado à página de detalhe: apenas `null` em campos numéricos opcionais vira null; `undefined` cai para Number(… ?? 0).
 */
export function mapPagamentoDetalheRow(row: Record<string, unknown> | null): PagamentoDetalheMapped | null {
  if (!row) {
    return null
  }
  parsePagamentoRowRecord(row)

  return {
    tipo: String(row.tipo ?? ''),
    valor_entrada: numeroNullableDetalhe(row.valor_entrada),
    num_parcelas: numeroNullableDetalhe(row.num_parcelas),
    taxa_servico_percentual: numeroNullableDetalhe(row.taxa_servico_percentual),
    aplicar_taxa: Boolean(row.aplicar_taxa),
    primeiro_vencimento: stringNullable(row.primeiro_vencimento),
    intervalo_dias: row.intervalo_dias != null ? Number(row.intervalo_dias) : null,
  }
}
