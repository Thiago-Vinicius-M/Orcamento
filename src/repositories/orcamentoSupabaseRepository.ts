import { requireSupabaseClient } from '../lib/supabaseClient'
import { resolveCompanyId } from '../lib/companyContext'
import type { OrcamentoStatus } from '../domain/orcamento/status'

export type ClienteRef = {
  id: string
  nome: string
}

export type ProdutoRef = {
  id: string
  codigo: string
  nome: string
  preco_unitario: number
}

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

export type OrcamentoContext = {
  company_id: string
  vendedor_id: string
}

type OrcamentoItemInsert = {
  orcamento_id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  subtotal: number
}

type OrcamentoPagamentoInsert = {
  orcamento_id: string
  tipo: string
  valor_entrada?: number | null
  num_parcelas?: number | null
  taxa_servico_percentual?: number | null
  aplicar_taxa?: boolean
}

type OrcamentoDetalheRaw = {
  orcamento: Record<string, unknown> | null
  itens: Record<string, unknown>[]
  pagamento: Record<string, unknown> | null
}

/** Dados brutos do banco para montar o PDF do orçamento (mapeamento para `Orcamento` fica no serviço). */
export type OrcamentoPdfOrcamentoRow = {
  id: string
  company_id: string
  numero_pdf: string | null
  status: string
  validade_ate: string
  subtotal: number
  desconto_total: number
  total: number
  desconto_tipo: string | null
  desconto_valor: number
  created_at: string
  created_by_user_id: string | null
  created_by_name: string | null
}

export type OrcamentoPdfEmpresaRow = {
  razao_social: string
  cnpj: string | null
  email_contato: string | null
  telefone_contato: string | null
  endereco: string | null
}

export type OrcamentoPdfClienteRow = {
  nome: string
  documento: string | null
  email: string | null
  telefone: string | null
  endereco: string | null
}

export type OrcamentoPdfItemRow = {
  id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  subtotal: number
  produto_nome: string
}

export type OrcamentoPdfPagamentoRow = {
  tipo: string
  valor_entrada: number | null
  num_parcelas: number | null
  taxa_servico_percentual: number | null
  aplicar_taxa: boolean
}

export type OrcamentoPdfDataRaw = {
  orcamento: OrcamentoPdfOrcamentoRow
  empresa: OrcamentoPdfEmpresaRow
  cliente: OrcamentoPdfClienteRow
  itens: OrcamentoPdfItemRow[]
  pagamento: OrcamentoPdfPagamentoRow | null
}

function getNestedRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null
  }
  if (Array.isArray(value)) {
    const first = value[0]
    return first && typeof first === 'object' ? (first as Record<string, unknown>) : null
  }
  return typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function mapPdfPagamentoRow(row: Record<string, unknown> | null): OrcamentoPdfPagamentoRow | null {
  if (!row) {
    return null
  }
  return {
    tipo: String(row.tipo ?? ''),
    valor_entrada: row.valor_entrada === null || row.valor_entrada === undefined ? null : Number(row.valor_entrada),
    num_parcelas: row.num_parcelas === null || row.num_parcelas === undefined ? null : Number(row.num_parcelas),
    taxa_servico_percentual:
      row.taxa_servico_percentual === null || row.taxa_servico_percentual === undefined
        ? null
        : Number(row.taxa_servico_percentual),
    aplicar_taxa: Boolean(row.aplicar_taxa),
  }
}

function mapOrcamentoPdfDataFromRows(
  orcamentoRow: Record<string, unknown>,
  itensRows: Record<string, unknown>[],
  pagamentoRow: Record<string, unknown> | null,
): OrcamentoPdfDataRaw {
  const clienteNested = getNestedRecord(orcamentoRow.clientes)
  const empresaNested = getNestedRecord(orcamentoRow.companies)

  if (!clienteNested || !empresaNested) {
    throw new Error('Dados de cliente ou empresa incompletos para o PDF.')
  }

  const itens: OrcamentoPdfItemRow[] = itensRows.map((row) => {
    const produtos = getNestedRecord(row.produtos)
    const produtoNome = typeof produtos?.nome === 'string' ? produtos.nome : ''

    return {
      id: String(row.id ?? ''),
      produto_id: String(row.produto_id ?? ''),
      quantidade: Number(row.quantidade ?? 0),
      preco_unitario: Number(row.preco_unitario ?? 0),
      subtotal: Number(row.subtotal ?? 0),
      produto_nome: produtoNome,
    }
  })

  return {
    orcamento: {
      id: String(orcamentoRow.id ?? ''),
      company_id: String(orcamentoRow.company_id ?? ''),
      numero_pdf:
        orcamentoRow.numero_pdf === null || orcamentoRow.numero_pdf === undefined
          ? null
          : String(orcamentoRow.numero_pdf),
      status: String(orcamentoRow.status ?? ''),
      validade_ate: String(orcamentoRow.validade_ate ?? ''),
      subtotal: Number(orcamentoRow.subtotal ?? 0),
      desconto_total: Number(orcamentoRow.desconto_total ?? 0),
      total: Number(orcamentoRow.total ?? 0),
      desconto_tipo:
        orcamentoRow.desconto_tipo === null || orcamentoRow.desconto_tipo === undefined
          ? null
          : String(orcamentoRow.desconto_tipo),
      desconto_valor: Number(orcamentoRow.desconto_valor ?? 0),
      created_at: String(orcamentoRow.created_at ?? ''),
      created_by_user_id:
        orcamentoRow.created_by_user_id === null || orcamentoRow.created_by_user_id === undefined
          ? null
          : String(orcamentoRow.created_by_user_id),
      created_by_name:
        orcamentoRow.created_by_name === null || orcamentoRow.created_by_name === undefined
          ? null
          : String(orcamentoRow.created_by_name),
    },
    empresa: {
      razao_social: String(empresaNested.razao_social ?? ''),
      cnpj: empresaNested.cnpj === null || empresaNested.cnpj === undefined ? null : String(empresaNested.cnpj),
      email_contato:
        empresaNested.email_contato === null || empresaNested.email_contato === undefined
          ? null
          : String(empresaNested.email_contato),
      telefone_contato:
        empresaNested.telefone_contato === null || empresaNested.telefone_contato === undefined
          ? null
          : String(empresaNested.telefone_contato),
      endereco:
        empresaNested.endereco === null || empresaNested.endereco === undefined ? null : String(empresaNested.endereco),
    },
    cliente: {
      nome: String(clienteNested.nome ?? ''),
      documento:
        clienteNested.documento === null || clienteNested.documento === undefined
          ? null
          : String(clienteNested.documento),
      email: clienteNested.email === null || clienteNested.email === undefined ? null : String(clienteNested.email),
      telefone:
        clienteNested.telefone === null || clienteNested.telefone === undefined ? null : String(clienteNested.telefone),
      endereco:
        clienteNested.endereco === null || clienteNested.endereco === undefined ? null : String(clienteNested.endereco),
    },
    itens,
    pagamento: mapPdfPagamentoRow(pagamentoRow),
  }
}

/** Perfis da empresa atual (RLS), para filtro “Gerado por” no painel do gerente. */
export async function loadProfilesDaEmpresaParaFiltro(): Promise<{ user_id: string; nome: string }[]> {
  const supabase = requireSupabaseClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, nome')
    .order('nome', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    user_id: String(row.user_id ?? ''),
    nome: String(row.nome ?? ''),
  }))
}

export async function loadOrcamentoReferences() {
  const supabase = requireSupabaseClient()

  const [{ data: clientesData, error: clientesError }, { data: produtosData, error: produtosError }] =
    await Promise.all([
      supabase.from('clientes').select('id, nome').order('nome', { ascending: true }),
      supabase
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
  }))

  const produtos: ProdutoRef[] = (produtosData ?? []).map((produto) => ({
    id: produto.id as string,
    codigo: (produto.codigo as string) ?? '',
    nome: (produto.nome as string) ?? '',
    preco_unitario: Number(produto.preco_unitario ?? 0),
  }))

  return { clientes, produtos }
}

export async function getOrcamentoContext(): Promise<OrcamentoContext> {
  const supabase = requireSupabaseClient()

  const [company_id, { data: userData, error: userErr }] = await Promise.all([
    resolveCompanyId(supabase),
    supabase.auth.getUser(),
  ])

  if (userErr || !userData?.user) {
    throw new Error(userErr?.message ?? 'Usuário não autenticado.')
  }

  return { company_id, vendedor_id: userData.user.id }
}

export async function nextOrcamentoNumeroPdf(): Promise<string> {
  const supabase = requireSupabaseClient()

  const { data, error } = await supabase.rpc('next_orcamento_numero_pdf')
  if (error) {
    throw new Error(error.message)
  }

  if (typeof data === 'string') {
    const trimmed = data.trim()
    if (trimmed !== '') return trimmed
  }

  if (data && typeof data === 'object') {
    const maybe = (data as { numero_pdf?: unknown }).numero_pdf
    if (typeof maybe === 'string') {
      const trimmed = maybe.trim()
      if (trimmed !== '') return trimmed
    }
  }

  throw new Error('Não foi possível obter o número do orçamento para o PDF.')
}

export async function insertOrcamento(insert: OrcamentoInsert): Promise<string> {
  const supabase = requireSupabaseClient()

  const { data, error } = await supabase.from('orcamentos').insert(insert).select('id').single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Não foi possível criar o orçamento.')
  }

  return data.id as string
}

export async function insertOrcamentoItens(itens: OrcamentoItemInsert[]) {
  const supabase = requireSupabaseClient()
  const { error } = await supabase.from('orcamento_itens').insert(itens)
  if (error) {
    throw new Error(error.message)
  }
}

export async function insertOrcamentoPagamento(pagamento: OrcamentoPagamentoInsert) {
  const supabase = requireSupabaseClient()
  const { error } = await supabase.from('orcamento_pagamento').insert(pagamento)
  if (error) {
    throw new Error(error.message)
  }
}

export async function loadOrcamentoDetalheRaw(orcamentoId: string): Promise<OrcamentoDetalheRaw> {
  const supabase = requireSupabaseClient()

  const [{ data: orcamentoData, error: orcamentoError }, { data: itensData, error: itensError }, { data: pagamentoData, error: pagamentoError }] =
    await Promise.all([
      supabase
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
      supabase
        .from('orcamento_itens')
        .select(
          `
          id,
          quantidade,
          preco_unitario,
          subtotal,
          produtos!inner ( codigo, nome )
        `,
        )
        .eq('orcamento_id', orcamentoId)
        .order('id', { ascending: true }),
      supabase
        .from('orcamento_pagamento')
        .select(
          `
          tipo,
          valor_entrada,
          num_parcelas,
          taxa_servico_percentual,
          aplicar_taxa
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

export async function findOrcamentoIdByNumeroPdf(numeroPdf: string): Promise<string | null> {
  const supabase = requireSupabaseClient()

  const { data, error } = await supabase
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

/**
 * Carrega orçamento, empresa (companies), cliente, itens com nome do produto e pagamento para geração de PDF.
 */
export async function loadOrcamentoPdfData(orcamentoId: string): Promise<OrcamentoPdfDataRaw> {
  const supabase = requireSupabaseClient()

  const [
    { data: orcamentoData, error: orcamentoError },
    { data: itensData, error: itensError },
    { data: pagamentoData, error: pagamentoError },
  ] = await Promise.all([
    supabase
      .from('orcamentos')
      .select(
        `
          id,
          company_id,
          numero_pdf,
          status,
          validade_ate,
          subtotal,
          desconto_total,
          total,
          desconto_tipo,
          desconto_valor,
          created_at,
          created_by_user_id,
          created_by_name,
          clientes!inner (
            nome,
            documento,
            email,
            telefone,
            endereco
          ),
          companies!inner (
            razao_social,
            cnpj,
            email_contato,
            telefone_contato,
            endereco
          )
        `,
      )
      .eq('id', orcamentoId)
      .maybeSingle(),
    supabase
      .from('orcamento_itens')
      .select(
        `
          id,
          produto_id,
          quantidade,
          preco_unitario,
          subtotal,
          produtos!inner ( nome )
        `,
      )
      .eq('orcamento_id', orcamentoId)
      .order('id', { ascending: true }),
    supabase
      .from('orcamento_pagamento')
      .select(
        `
          tipo,
          valor_entrada,
          num_parcelas,
          taxa_servico_percentual,
          aplicar_taxa
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

  if (!orcamentoData) {
    throw new Error('Orçamento não encontrado.')
  }

  const orcamentoRow = orcamentoData as Record<string, unknown>
  const itensRows = (itensData as Record<string, unknown>[] | null) ?? []

  return mapOrcamentoPdfDataFromRows(
    orcamentoRow,
    itensRows,
    (pagamentoData as Record<string, unknown> | null) ?? null,
  )
}

export async function atualizarStatusOrcamento(id: string, status: OrcamentoStatus): Promise<void> {
  const supabase = requireSupabaseClient()

  const { error } = await supabase
    .from('orcamentos')
    .update({ status })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function excluirOrcamento(id: string): Promise<void> {
  const supabase = requireSupabaseClient()

  const { error } = await supabase
    .from('orcamentos')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}
