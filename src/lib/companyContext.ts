import type { SupabaseClient } from '@supabase/supabase-js'

export async function resolveCompanyId(supabase: SupabaseClient): Promise<string> {
  const { data: companyIdData, error: companyIdErr } =
    await supabase.rpc('current_company_id')

  if (companyIdErr) {
    throw new Error(companyIdErr.message)
  }

  let company_id = companyIdData as string | null

  if (!company_id) {
    const { data: repaired, error: repairErr } =
      await supabase.rpc('ensure_gerente_profile')
    if (repairErr) {
      throw new Error(
        `Perfil sem empresa: ${repairErr.message}. Aplique as migrações no Supabase (veja DEPLOY.md).`,
      )
    }
    company_id = (repaired as string | null) ?? null
  }

  if (!company_id) {
    throw new Error(
      'Não foi possível determinar `company_id`. Confirme o e-mail, faça login com código da empresa + usuário + senha, ou veja DEPLOY.md (migrações e edge function register-gerente).',
    )
  }

  return company_id
}
