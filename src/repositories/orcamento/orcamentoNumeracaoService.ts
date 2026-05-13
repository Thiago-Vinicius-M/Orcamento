import type { SupabaseClient } from '@supabase/supabase-js'

import { getDefaultSupabase } from '../../lib/supabaseClient'

export async function nextOrcamentoNumeroPdfWithClient(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.rpc('next_orcamento_numero_pdf')

  if (error) {
    throw new Error(error.message)
  }

  const numero = typeof data === 'string' ? data.trim() : ''
  if (!numero) {
    throw new Error('Não foi possível obter o número do orçamento para PDF.')
  }

  return numero
}

export async function nextOrcamentoNumeroPdf(): Promise<string> {
  return nextOrcamentoNumeroPdfWithClient(getDefaultSupabase())
}

export function createOrcamentoNumeracaoService(client: SupabaseClient) {
  return {
    nextOrcamentoNumeroPdf: () => nextOrcamentoNumeroPdfWithClient(client),
  }
}

export function defaultOrcamentoNumeracaoService() {
  return createOrcamentoNumeracaoService(getDefaultSupabase())
}
