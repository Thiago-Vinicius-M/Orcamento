import { normalizeCreatedByName, normalizeCreatedByUserId } from '../../mappers/orcamento'
import { isOrcamentoStatus, type OrcamentoStatus } from './status'

type ClienteRaw = {
  nome?: unknown
}

function narrowClienteRaw(value: unknown): ClienteRaw {
  if (value === null || typeof value !== 'object') {
    return {}
  }
  const o = value as Record<string, unknown>
  return 'nome' in o ? { nome: o.nome } : {}
}

function narrowClientesField(value: unknown): OrcamentoRawRow['clientes'] {
  if (value === null) {
    return null
  }
  if (value === undefined) {
    return undefined
  }
  if (Array.isArray(value)) {
    return value.map(narrowClienteRaw)
  }
  if (typeof value === 'object') {
    return narrowClienteRaw(value)
  }
  return undefined
}

/** Linha vinda do PostgREST/Supabase: extrai só chaves conhecidas, sem afirmar shape completo. */
export function narrowOrcamentoRawRow(row: unknown): OrcamentoRawRow {
  if (row === null || typeof row !== 'object') {
    return {}
  }
  const o = row as Record<string, unknown>
  return {
    id: o.id,
    status: o.status,
    created_at: o.created_at,
    validade_ate: o.validade_ate,
    total: o.total,
    clientes: narrowClientesField(o.clientes),
    created_by_user_id: o.created_by_user_id,
    created_by_name: o.created_by_name,
    numero_pdf: o.numero_pdf,
  }
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
  numero_pdf?: unknown
}

export type OrcamentoListRow = {
  id: string
  status: OrcamentoStatus
  created_at: string
  validade_ate: string
  total: number
  cliente_nome: string
  created_by_user_id: string | null
  created_by_name: string | null
  gerado_por_nome: string
  numero_pdf: string | null
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
    validade_ate: typeof row.validade_ate === 'string' ? row.validade_ate : '',
    total: Number(row.total ?? 0),
    cliente_nome: clienteNome,
    created_by_user_id: createdByUserId,
    created_by_name: createdByName,
    gerado_por_nome: createdByName ?? '—',
    numero_pdf: typeof row.numero_pdf === 'string' ? row.numero_pdf : null,
  }
}
