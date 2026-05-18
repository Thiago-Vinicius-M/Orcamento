import type { SupabaseClient } from '@supabase/supabase-js'
import { getDefaultSupabase } from '../../lib/supabaseClient'

export type ClienteRef = {
  id: string
  nome: string
  documento: string | null
}

export type ProdutoRef = {
  id: string
  codigo: string
  nome: string
  preco_unitario: number
}

export type OrcamentosListFiltros = {
  dataInicio: string
  dataFim: string
  clienteId: string
  produtoId: string
  usuarioId: string
}

type OrcamentoDetalheRaw = {
  orcamento: Record<string, unknown> | null
  itens: Record<string, unknown>[]
  pagamento: Record<string, unknown> | null
}

const ORCAMENTO_LIST_SELECT = `
  id,
  status,
  created_at,
  validade_ate,
  total,
  numero_pdf,
  created_by_user_id,
  created_by_name,
  clientes!inner ( nome )
`

export async function loadOrcamentoReferencesWithClient(
  client: SupabaseClient,
): Promise<{ clientes: ClienteRef[]; produtos: ProdutoRef[] }> {
  const [
    { data: clientesData, error: clientesError },
    { data: produtosData, error: produtosError },
  ] = await Promise.all([
    client.from('clientes').select('id, nome, documento').order('nome', { ascending: true }),
    client
      .from('produtos')
      .select('id, codigo, nome, preco_unitario, ativo')
      .eq('ativo', true)
      .order('nome', { ascending: true }),
  ])

  if (clientesError) {
    throw new Error(clientesError.message)
  }

  if (produtosError) {
    throw new Error(produtosError.message)
  }

  const clientes: ClienteRef[] = (clientesData ?? []).map((cliente) => ({
    id: cliente.id as string,
    nome: (cliente.nome as string) ?? '',
    documento:
      cliente.documento == null ? null : String(cliente.documento),
  }))

  const produtos: ProdutoRef[] = (produtosData ?? []).map((produto) => ({
    id: produto.id as string,
    codigo: (produto.codigo as string) ?? '',
    nome: (produto.nome as string) ?? '',
    preco_unitario: Number(produto.preco_unitario ?? 0),
  }))

  return { clientes, produtos }
}

export async function listOrcamentosComFiltrosWithClient(
  client: SupabaseClient,
  filtros: OrcamentosListFiltros,
): Promise<Record<string, unknown>[]> {
  let orcamentoIdsFromProduto: string[] | null = null

  if (filtros.produtoId) {
    const { data: itensData, error: itensErr } = await client
      .from('orcamento_itens')
      .select('orcamento_id')
      .eq('produto_id', filtros.produtoId)

    if (itensErr) {
      throw new Error(itensErr.message)
    }

    orcamentoIdsFromProduto = [
      ...new Set((itensData ?? []).map((r) => r.orcamento_id as string)),
    ]

    if (orcamentoIdsFromProduto.length === 0) {
      return []
    }
  }

  let query = client
    .from('orcamentos')
    .select(ORCAMENTO_LIST_SELECT)
    .order('created_at', { ascending: false })

  if (filtros.dataInicio) {
    query = query.gte('created_at', `${filtros.dataInicio}T00:00:00`)
  }
  if (filtros.dataFim) {
    query = query.lte('created_at', `${filtros.dataFim}T23:59:59`)
  }
  if (filtros.clienteId) {
    query = query.eq('cliente_id', filtros.clienteId)
  }
  if (filtros.usuarioId) {
    query = query.eq('created_by_user_id', filtros.usuarioId)
  }
  if (orcamentoIdsFromProduto) {
    query = query.in('id', orcamentoIdsFromProduto)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Record<string, unknown>[]
}

export async function loadOrcamentoDetalheRawWithClient(
  client: SupabaseClient,
  orcamentoId: string,
): Promise<OrcamentoDetalheRaw> {
  const [
    { data: orcamentoData, error: orcamentoError },
    { data: itensData, error: itensError },
    { data: pagamentoData, error: pagamentoError },
  ] = await Promise.all([
    client
      .from('orcamentos')
      .select(
        `
          id,
          status,
          vendedor_id,
          validade_ate,
          subtotal,
          desconto_total,
          total,
          created_at,
          created_by_user_id,
          created_by_name,
          clientes!inner ( nome )
        `,
      )
      .eq('id', orcamentoId)
      .maybeSingle(),
    client
      .from('orcamento_itens')
      .select(
        `
          id,
          quantidade,
          preco_unitario,
          desconto_percentual,
          subtotal,
          produtos!inner ( codigo, nome )
        `,
      )
      .eq('orcamento_id', orcamentoId)
      .order('id', { ascending: true }),
    client
      .from('orcamento_pagamento')
      .select(
        `
          tipo,
          valor_entrada,
          num_parcelas,
          taxa_servico_percentual,
          aplicar_taxa,
          primeiro_vencimento,
          intervalo_dias
        `,
      )
      .eq('orcamento_id', orcamentoId)
      .maybeSingle(),
  ])

  if (orcamentoError) {
    throw new Error(orcamentoError.message)
  }

  if (itensError) {
    throw new Error(itensError.message)
  }

  if (pagamentoError) {
    throw new Error(pagamentoError.message)
  }

  return {
    orcamento: (orcamentoData as Record<string, unknown> | null) ?? null,
    itens: (itensData as Record<string, unknown>[] | null) ?? [],
    pagamento: (pagamentoData as Record<string, unknown> | null) ?? null,
  }
}

export async function findOrcamentoIdByNumeroPdfWithClient(
  client: SupabaseClient,
  numeroPdf: string,
): Promise<string | null> {
  const { data, error } = await client
    .from('orcamentos')
    .select('id')
    .eq('numero_pdf', numeroPdf)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data?.id) {
    return null
  }

  return String(data.id)
}

export function createOrcamentoReadRepo(client: SupabaseClient) {
  return {
    loadOrcamentoReferences: () => loadOrcamentoReferencesWithClient(client),
    listOrcamentosComFiltros: (filtros: OrcamentosListFiltros) =>
      listOrcamentosComFiltrosWithClient(client, filtros),
    loadOrcamentoDetalheRaw: (orcamentoId: string) =>
      loadOrcamentoDetalheRawWithClient(client, orcamentoId),
    findOrcamentoIdByNumeroPdf: (numeroPdf: string) =>
      findOrcamentoIdByNumeroPdfWithClient(client, numeroPdf),
  }
}

export function defaultOrcamentoReadRepo() {
  return createOrcamentoReadRepo(getDefaultSupabase())
}

/** @deprecated Prefira `createOrcamentoReadRepo(client)` ou `defaultOrcamentoReadRepo()`. */
export async function loadOrcamentoReferences() {
  return loadOrcamentoReferencesWithClient(getDefaultSupabase())
}

/** @deprecated Prefira `createOrcamentoReadRepo(client)` ou `defaultOrcamentoReadRepo()`. */
export async function listOrcamentosComFiltros(filtros: OrcamentosListFiltros) {
  return listOrcamentosComFiltrosWithClient(getDefaultSupabase(), filtros)
}

/** @deprecated Prefira `createOrcamentoReadRepo(client)` ou `defaultOrcamentoReadRepo()`. */
export async function loadOrcamentoDetalheRaw(orcamentoId: string): Promise<OrcamentoDetalheRaw> {
  return loadOrcamentoDetalheRawWithClient(getDefaultSupabase(), orcamentoId)
}

/** @deprecated Prefira `createOrcamentoReadRepo(client)` ou `defaultOrcamentoReadRepo()`. */
export async function findOrcamentoIdByNumeroPdf(numeroPdf: string): Promise<string | null> {
  return findOrcamentoIdByNumeroPdfWithClient(getDefaultSupabase(), numeroPdf)
}
