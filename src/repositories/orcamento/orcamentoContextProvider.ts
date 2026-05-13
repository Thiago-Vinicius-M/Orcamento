import type { SupabaseClient } from '@supabase/supabase-js'
import { getDefaultSupabase } from '../../lib/supabaseClient'
import { resolveCompanyId } from '../../lib/companyContext'

export type OrcamentoContext = {
  company_id: string
  vendedor_id: string
}

export async function getOrcamentoContextWithClient(client: SupabaseClient): Promise<OrcamentoContext> {
  const [company_id, { data: userData, error: userErr }] = await Promise.all([
    resolveCompanyId(client),
    client.auth.getUser(),
  ])

  if (userErr || !userData?.user) {
    throw new Error(userErr?.message ?? 'Usuário não autenticado.')
  }

  return { company_id, vendedor_id: userData.user.id }
}

export function createOrcamentoContextProvider(client: SupabaseClient) {
  return {
    getOrcamentoContext: () => getOrcamentoContextWithClient(client),
  }
}

export function defaultOrcamentoContextProvider() {
  return createOrcamentoContextProvider(getDefaultSupabase())
}

/** @deprecated Prefira `createOrcamentoContextProvider(client)` ou `defaultOrcamentoContextProvider()`. */
export async function getOrcamentoContext(): Promise<OrcamentoContext> {
  return getOrcamentoContextWithClient(getDefaultSupabase())
}
