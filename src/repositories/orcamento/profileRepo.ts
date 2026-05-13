import type { SupabaseClient } from '@supabase/supabase-js'
import { getDefaultSupabase } from '../../lib/supabaseClient'

/** Perfis da empresa atual (RLS), para filtro “Gerado por” no painel do gerente. */
export async function loadProfilesDaEmpresaParaFiltroWithClient(
  client: SupabaseClient,
): Promise<{ user_id: string; nome: string }[]> {
  const { data, error } = await client.from('profiles').select('user_id, nome').order('nome', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    user_id: String(row.user_id ?? ''),
    nome: String(row.nome ?? ''),
  }))
}

export function createProfileRepo(client: SupabaseClient) {
  return {
    loadProfilesDaEmpresaParaFiltro: () => loadProfilesDaEmpresaParaFiltroWithClient(client),
  }
}

export function defaultProfileRepo() {
  return createProfileRepo(getDefaultSupabase())
}

/** @deprecated Prefira `createProfileRepo(client)` ou `defaultProfileRepo()`. */
export async function loadProfilesDaEmpresaParaFiltro(): Promise<{ user_id: string; nome: string }[]> {
  return loadProfilesDaEmpresaParaFiltroWithClient(getDefaultSupabase())
}
