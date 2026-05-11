import { requireSupabaseClient } from '../lib/supabaseClient'
import { resolveCompanyId } from '../lib/companyContext'

export type Produto = {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  preco_unitario: number
  ativo: boolean
}

export type ProdutoPayload = {
  codigo: string
  nome: string
  descricao: string | null
  preco_unitario: number
  ativo: boolean
}

const PRODUTO_SELECT = 'id, codigo, nome, descricao, preco_unitario, ativo' as const

function mapProduto(row: Record<string, unknown>): Produto {
  return {
    id: row.id as string,
    codigo: (row.codigo as string) ?? '',
    nome: (row.nome as string) ?? '',
    descricao: (row.descricao as string | null) ?? null,
    preco_unitario: Number(row.preco_unitario ?? 0),
    ativo: Boolean(row.ativo),
  }
}

function translatePermissionError(message: string, fallback: string): string {
  if (message.includes('permission denied')) {
    return fallback
  }
  return message
}

export async function listProdutos(): Promise<Produto[]> {
  const supabase = requireSupabaseClient()

  const { data, error } = await supabase
    .from('produtos')
    .select(PRODUTO_SELECT)
    .order('nome', { ascending: true })

  if (error) {
    throw new Error(
      translatePermissionError(error.message, 'Apenas gerentes podem gerenciar produtos.'),
    )
  }

  return (data ?? []).map(mapProduto)
}

export async function createProduto(payload: ProdutoPayload): Promise<Produto> {
  const supabase = requireSupabaseClient()
  const company_id = await resolveCompanyId(supabase)

  const { data, error } = await supabase
    .from('produtos')
    .insert({ ...payload, company_id })
    .select(PRODUTO_SELECT)
    .single()

  if (error || !data) {
    throw new Error(
      translatePermissionError(
        error?.message ?? 'Não foi possível criar o produto.',
        'Apenas gerentes podem criar produtos.',
      ),
    )
  }

  return mapProduto(data)
}

export async function updateProduto(id: string, payload: ProdutoPayload): Promise<Produto> {
  const supabase = requireSupabaseClient()

  const { data, error } = await supabase
    .from('produtos')
    .update(payload)
    .eq('id', id)
    .select(PRODUTO_SELECT)
    .single()

  if (error || !data) {
    throw new Error(
      translatePermissionError(
        error?.message ?? 'Não foi possível atualizar o produto.',
        'Apenas gerentes podem alterar produtos.',
      ),
    )
  }

  return mapProduto(data)
}

export async function deleteProduto(id: string): Promise<void> {
  const supabase = requireSupabaseClient()

  const { error } = await supabase.from('produtos').delete().eq('id', id)

  if (error) {
    throw new Error(
      translatePermissionError(error.message, 'Apenas gerentes podem excluir produtos.'),
    )
  }
}
