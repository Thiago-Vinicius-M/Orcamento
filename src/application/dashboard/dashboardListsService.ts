import type { SupabaseClient } from '@supabase/supabase-js'
import {
  narrowOrcamentoRawRow,
  toOrcamentoListRow,
  type OrcamentoListRow,
} from '../../domain/orcamento/mappers'
import type { OrcamentoStatus } from '../../domain/orcamento/status'

const DASHBOARD_LIST_SELECT = `
  id,
  status,
  created_at,
  validade_ate,
  total,
  created_by_user_id,
  created_by_name,
  clientes!inner ( nome )
`

export async function fetchDashboardOrcamentosList(
  client: SupabaseClient,
  status: Extract<OrcamentoStatus, 'pendente' | 'vigente'>,
): Promise<OrcamentoListRow[]> {
  const { data, error } = await client
    .from('orcamentos')
    .select(DASHBOARD_LIST_SELECT)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => toOrcamentoListRow(narrowOrcamentoRawRow(row), status))
}
