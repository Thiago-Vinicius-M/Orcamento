import { resolveCompanyId } from '../lib/companyContext'
import { repositoryErrorText, translatePermissionDenied } from '../lib/errors'
import { getDefaultSupabase } from '../lib/supabaseClient'
import {
  createLazyCrudRepository,
  createSupabaseCrudRepository,
  type CrudOperation,
  type CrudRepository,
} from './base/createSupabaseCrudRepository'

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

/** Shape da linha devolvida por `select` em `produtos` (RLS + colunas pedidas). */
type ProdutoRow = {
  id: string
  codigo: string | null
  nome: string | null
  descricao: string | null
  preco_unitario: number | null
  ativo: boolean | null
}

function mapProduto(row: ProdutoRow): Produto {
  return {
    id: row.id,
    codigo: row.codigo ?? '',
    nome: row.nome ?? '',
    descricao: row.descricao ?? null,
    preco_unitario: Number(row.preco_unitario ?? 0),
    ativo: Boolean(row.ativo),
  }
}

const PERMISSAO_POR_OPERACAO: Record<CrudOperation, string> = {
  list: 'Não foi possível carregar produtos.',
  create: 'Apenas gerentes podem criar produtos.',
  update: 'Apenas gerentes podem alterar produtos.',
  remove: 'Apenas gerentes podem excluir produtos.',
}

function translateProdutoError(err: unknown, op: CrudOperation): Error {
  const raw = repositoryErrorText(err)
  const textoSeVazio =
    op === 'create'
      ? 'Não foi possível criar o produto.'
      : op === 'update'
        ? 'Não foi possível atualizar o produto.'
        : ''

  const mensagemInterna = raw.trim().length > 0 ? raw : textoSeVazio

  return new Error(translatePermissionDenied(mensagemInterna, PERMISSAO_POR_OPERACAO[op]))
}

export const produtoRepo: CrudRepository<Produto, ProdutoPayload> = createLazyCrudRepository(() =>
  createSupabaseCrudRepository<ProdutoRow, Produto, ProdutoPayload>(
    { supabase: getDefaultSupabase(), companyResolver: resolveCompanyId },
    {
      table: 'produtos',
      select: PRODUTO_SELECT,
      mapRow: mapProduto,
      toInsert: (payload, ctx) => ({ ...payload, company_id: ctx.company_id }),
      toUpdate: (payload) => ({ ...payload }),
      emptyResultMessages: {
        create: 'Não foi possível criar o produto.',
        update: 'Não foi possível atualizar o produto.',
      },
      translateError: translateProdutoError,
    },
  ),
)

export async function listProdutos(): Promise<Produto[]> {
  return produtoRepo.list()
}

export async function createProduto(payload: ProdutoPayload): Promise<Produto> {
  return produtoRepo.create(payload)
}

export async function updateProduto(id: string, payload: ProdutoPayload): Promise<Produto> {
  return produtoRepo.update(id, payload)
}

export async function deleteProduto(id: string): Promise<void> {
  return produtoRepo.remove(id)
}
