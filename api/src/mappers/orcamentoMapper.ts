export type OrcamentoDto = {
  id: number
  numero: number
  clienteId: number | null
  empresaId: number
  dataEmissao: string
  dataValidade: string
  subtotal: number
  descontoValor: number
  descontoPercentual: number
  total: number
  status: string
  observacoes: string | null
  createdAt?: string
  updatedAt?: string
}

type OrcamentoRow = {
  id: unknown
  numero: unknown
  cliente_id: unknown
  empresa_id: unknown
  data_emissao: unknown
  data_validade: unknown
  subtotal: unknown
  desconto_valor: unknown
  desconto_percentual: unknown
  total: unknown
  status: unknown
  observacoes: unknown
  created_at?: unknown
  updated_at?: unknown
}

export function mapOrcamentoRow(row: OrcamentoRow): OrcamentoDto {
  return {
    id: row.id as number,
    numero: row.numero as number,
    clienteId: (row.cliente_id as number | null) ?? null,
    empresaId: row.empresa_id as number,
    dataEmissao: row.data_emissao as string,
    dataValidade: row.data_validade as string,
    subtotal: Number(row.subtotal),
    descontoValor: Number(row.desconto_valor),
    descontoPercentual: Number(row.desconto_percentual),
    total: Number(row.total),
    status: row.status as string,
    observacoes: (row.observacoes as string | null) ?? null,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  }
}

