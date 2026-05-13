import { resolveCompanyId } from '../lib/companyContext'
import { getDefaultSupabase } from '../lib/supabaseClient'
import {
  createLazyCrudRepository,
  createSupabaseCrudRepository,
  type CrudRepository,
} from './base/createSupabaseCrudRepository'

export type Cliente = {
  id: string
  nome: string
  documento: string | null
  email: string | null
  telefone: string | null
  endereco: string | null
}

export type ClientePayload = {
  nome: string
  documento: string | null
  email: string | null
  telefone: string | null
  endereco: string | null
}

const CLIENTE_SELECT = 'id, nome, documento, email, telefone, endereco' as const

/** Shape da linha devolvida por `select` em `clientes` (RLS + colunas pedidas). */
type ClienteRow = {
  id: string
  nome: string | null
  documento: string | null
  email: string | null
  telefone: string | null
  endereco: string | null
}

function mapCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    nome: row.nome ?? '',
    documento: row.documento ?? null,
    email: row.email ?? null,
    telefone: row.telefone ?? null,
    endereco: row.endereco ?? null,
  }
}

export const clienteRepo: CrudRepository<Cliente, ClientePayload> = createLazyCrudRepository(() =>
  createSupabaseCrudRepository<ClienteRow, Cliente, ClientePayload>(
    { supabase: getDefaultSupabase(), companyResolver: resolveCompanyId },
    {
      table: 'clientes',
      select: CLIENTE_SELECT,
      mapRow: mapCliente,
      toInsert: (payload, ctx) => ({ ...payload, company_id: ctx.company_id }),
      toUpdate: (payload) => ({ ...payload }),
      emptyResultMessages: {
        create: 'Não foi possível criar o cliente.',
        update: 'Não foi possível atualizar o cliente.',
      },
    },
  ),
)

export async function listClientes(): Promise<Cliente[]> {
  return clienteRepo.list()
}

export async function createCliente(payload: ClientePayload): Promise<Cliente> {
  return clienteRepo.create(payload)
}

export async function updateCliente(id: string, payload: ClientePayload): Promise<Cliente> {
  return clienteRepo.update(id, payload)
}

export async function deleteCliente(id: string): Promise<void> {
  return clienteRepo.remove(id)
}
