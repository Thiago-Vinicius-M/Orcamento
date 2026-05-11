import { isOrcamentoStatus, type OrcamentoStatus } from './status'

type ClienteRaw = {
  nome?: unknown
}

export type OrcamentoRawRow = {
  id?: unknown
  status?: unknown
  created_at?: unknown
  validade_ate?: unknown
  total?: unknown
  clientes?: ClienteRaw | ClienteRaw[] | null
  created_by_user_id?: unknown
  created_by_name?: unknown
}

export type OrcamentoListRow = {
  id: string
  status: OrcamentoStatus
  created_at: string
  total: number
  cliente_nome: string
  created_by_user_id: string | null
  created_by_name: string | null
  gerado_por_nome: string
}

function normalizeCreatedByUserId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  const text = String(value).trim()
  return text === '' ? null : text
}

function normalizeCreatedByName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function toOrcamentoListRow(
  row: OrcamentoRawRow,
  fallbackStatus: OrcamentoStatus = 'pendente',
): OrcamentoListRow {
  const clientes = row.clientes
  const clienteNomeRaw = Array.isArray(clientes) ? clientes[0]?.nome : clientes?.nome
  const clienteNome =
    typeof clienteNomeRaw === 'string' && clienteNomeRaw.length > 0 ? clienteNomeRaw : '—'

  const createdByUserId = normalizeCreatedByUserId(row.created_by_user_id)
  const createdByName = normalizeCreatedByName(row.created_by_name)

  return {
    id: typeof row.id === 'string' ? row.id : '',
    status: isOrcamentoStatus(row.status) ? row.status : fallbackStatus,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    total: Number(row.total ?? 0),
    cliente_nome: clienteNome,
    created_by_user_id: createdByUserId,
    created_by_name: createdByName,
    gerado_por_nome: createdByName ?? '—',
  }
}
