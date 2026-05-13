import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1?target=deno'

export interface CompanyAllocation {
  company_id: string
  login_code: string
}

export async function allocateCompany(
  supabaseAdmin: SupabaseClient,
  razaoSocial: string,
  cnpj: string | null,
): Promise<CompanyAllocation> {
  const { data, error } = await supabaseAdmin
    .rpc('create_company_with_next_login_code', {
      _razao_social: razaoSocial,
      _cnpj: cnpj,
    })
    .single()

  if (error) {
    console.error('createCompanyWithNextLoginCode: rpc failed', error)
    throw new Error(`Falha ao criar empresa: ${error.message}`)
  }

  const allocation = data as CompanyAllocation | null
  if (!allocation?.company_id || !allocation.login_code) {
    throw new Error('Falha ao criar empresa: retorno inválido do banco')
  }

  return allocation
}

export async function compensateAllocateCompany(
  supabaseAdmin: SupabaseClient,
  companyId: string,
): Promise<void> {
  const { error } = await supabaseAdmin.from('companies').delete().eq('id', companyId)
  if (error) {
    console.error('deleteCompany: rollback falhou', { companyId, error })
  }
}
