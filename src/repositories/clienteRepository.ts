import { requireSupabaseClient } from '../lib/supabaseClient'
import { resolveCompanyId } from '../lib/companyContext'

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

function mapCliente(row: Record<string, unknown>): Cliente {
  return {
    id: row.id as string,
    nome: (row.nome as string) ?? '',
    documento: (row.documento as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    telefone: (row.telefone as string | null) ?? null,
    endereco: (row.endereco as string | null) ?? null,
  }
}

export async function listClientes(): Promise<Cliente[]> {
  const supabase = requireSupabaseClient()

  const { data, error } = await supabase
    .from('clientes')
    .select(CLIENTE_SELECT)
    .order('nome', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapCliente)
}

export async function createCliente(payload: ClientePayload): Promise<Cliente> {
  const supabase = requireSupabaseClient()
  const company_id = await resolveCompanyId(supabase)

  const { data, error } = await supabase
    .from('clientes')
    .insert({ ...payload, company_id })
    .select(CLIENTE_SELECT)
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Não foi possível criar o cliente.')
  }

  return mapCliente(data)
}

export async function updateCliente(id: string, payload: ClientePayload): Promise<Cliente> {
  const supabase = requireSupabaseClient()

  const { data, error } = await supabase
    .from('clientes')
    .update(payload)
    .eq('id', id)
    .select(CLIENTE_SELECT)
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Não foi possível atualizar o cliente.')
  }

  return mapCliente(data)
}

export async function deleteCliente(id: string): Promise<void> {
  const supabase = requireSupabaseClient()

  const { error } = await supabase.from('clientes').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}
