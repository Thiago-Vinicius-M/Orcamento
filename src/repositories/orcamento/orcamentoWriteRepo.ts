import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrcamentoStatus } from '../../domain/orcamento/status'
import { getDefaultSupabase } from '../../lib/supabaseClient'

/** Payload de insert: `created_by_*` não entra aqui — o banco preenche via trigger. */
type OrcamentoInsert = {
  cliente_id: string
  company_id: string
  vendedor_id: string
  numero_pdf: string
  subtotal: number
  desconto_total: number
  total: number
  desconto_tipo?: string | null
  desconto_valor?: number
}

type OrcamentoItemInsert = {
  orcamento_id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  desconto_percentual: number
  subtotal: number
}

type OrcamentoPagamentoInsert = {
  orcamento_id: string
  tipo: string
  valor_entrada?: number | null
  num_parcelas?: number | null
  taxa_servico_percentual?: number | null
  aplicar_taxa?: boolean
  primeiro_vencimento?: string | null
  intervalo_dias?: number | null
}

export async function insertOrcamentoWithClient(client: SupabaseClient, insert: OrcamentoInsert): Promise<string> {
  const { data, error } = await client.from('orcamentos').insert(insert).select('id').single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Não foi possível criar o orçamento.')
  }

  return data.id as string
}

export async function insertOrcamentoItensWithClient(client: SupabaseClient, itens: OrcamentoItemInsert[]) {
  const { error } = await client.from('orcamento_itens').insert(itens)
  if (error) {
    throw new Error(error.message)
  }
}

export async function insertOrcamentoPagamentoWithClient(
  client: SupabaseClient,
  pagamento: OrcamentoPagamentoInsert,
) {
  const { error } = await client.from('orcamento_pagamento').insert(pagamento)
  if (error) {
    throw new Error(error.message)
  }
}

export async function atualizarStatusOrcamentoWithClient(
  client: SupabaseClient,
  id: string,
  status: OrcamentoStatus,
): Promise<void> {
  const { error } = await client.from('orcamentos').update({ status }).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function excluirOrcamentoWithClient(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('orcamentos').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export function createOrcamentoWriteRepo(client: SupabaseClient) {
  return {
    insertOrcamento: (insert: OrcamentoInsert) => insertOrcamentoWithClient(client, insert),
    insertOrcamentoItens: (itens: OrcamentoItemInsert[]) => insertOrcamentoItensWithClient(client, itens),
    insertOrcamentoPagamento: (pagamento: OrcamentoPagamentoInsert) =>
      insertOrcamentoPagamentoWithClient(client, pagamento),
    atualizarStatusOrcamento: (id: string, status: OrcamentoStatus) =>
      atualizarStatusOrcamentoWithClient(client, id, status),
    excluirOrcamento: (id: string) => excluirOrcamentoWithClient(client, id),
  }
}

export function defaultOrcamentoWriteRepo() {
  return createOrcamentoWriteRepo(getDefaultSupabase())
}

/** @deprecated Prefira factories; mantido para compatibilidade. */
export async function insertOrcamento(insert: OrcamentoInsert): Promise<string> {
  return insertOrcamentoWithClient(getDefaultSupabase(), insert)
}

/** @deprecated Prefira factories; mantido para compatibilidade. */
export async function insertOrcamentoItens(itens: OrcamentoItemInsert[]) {
  return insertOrcamentoItensWithClient(getDefaultSupabase(), itens)
}

/** @deprecated Prefira factories; mantido para compatibilidade. */
export async function insertOrcamentoPagamento(pagamento: OrcamentoPagamentoInsert) {
  return insertOrcamentoPagamentoWithClient(getDefaultSupabase(), pagamento)
}

/** @deprecated Prefira factories; mantido para compatibilidade. */
export async function atualizarStatusOrcamento(id: string, status: OrcamentoStatus): Promise<void> {
  return atualizarStatusOrcamentoWithClient(getDefaultSupabase(), id, status)
}

/** @deprecated Prefira factories; mantido para compatibilidade. */
export async function excluirOrcamento(id: string): Promise<void> {
  return excluirOrcamentoWithClient(getDefaultSupabase(), id)
}
