import { getNestedRecord, mapPdfPagamentoRow, type MappedPdfPagamentoRow } from '../../mappers/orcamento'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getDefaultSupabase } from '../../lib/supabaseClient'

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
  logo_url: string | null
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

export type OrcamentoPdfPagamentoRow = MappedPdfPagamentoRow

export type OrcamentoPdfDataRaw = {
  orcamento: OrcamentoPdfOrcamentoRow
  empresa: OrcamentoPdfEmpresaRow
  cliente: OrcamentoPdfClienteRow
  itens: OrcamentoPdfItemRow[]
  pagamento: OrcamentoPdfPagamentoRow | null
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
      logo_url:
        empresaNested.logo_url === null || empresaNested.logo_url === undefined ? null : String(empresaNested.logo_url),
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

/**
 * Carrega orçamento, empresa (companies), cliente, itens com nome do produto e pagamento para geração de PDF.
 */
export async function loadOrcamentoPdfDataWithClient(
  client: SupabaseClient,
  orcamentoId: string,
): Promise<OrcamentoPdfDataRaw> {
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
            endereco,
            logo_url
          )
        `,
      )
      .eq('id', orcamentoId)
      .maybeSingle(),
    client
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

export function createOrcamentoPdfRepo(client: SupabaseClient) {
  return {
    loadOrcamentoPdfData: (orcamentoId: string) => loadOrcamentoPdfDataWithClient(client, orcamentoId),
  }
}

export function defaultOrcamentoPdfRepo() {
  return createOrcamentoPdfRepo(getDefaultSupabase())
}

/** @deprecated Prefira `createOrcamentoPdfRepo(client)` ou `defaultOrcamentoPdfRepo()`. */
export async function loadOrcamentoPdfData(orcamentoId: string): Promise<OrcamentoPdfDataRaw> {
  return loadOrcamentoPdfDataWithClient(getDefaultSupabase(), orcamentoId)
}
