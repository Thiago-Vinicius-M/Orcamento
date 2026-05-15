import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1?target=deno'
import type { RegisterGerenteBody } from '../../_shared/validation.ts'
import type { CompanyAllocation } from './allocateCompanyStep.ts'

export interface CreateGerenteAuthUserResult {
  userId: string
}

/**
 * Cria o usuário no GoTrue com service_role num único passo (app_metadata + user_metadata).
 * O envio do e-mail de confirmação (resend) é responsabilidade do cliente browser com PKCE,
 * pois o code_verifier/code_challenge deve ser gerado e armazenado no navegador.
 */
export async function createGerenteAuthUser(
  supabaseAdmin: SupabaseClient,
  body: RegisterGerenteBody,
  allocation: CompanyAllocation,
): Promise<
  { ok: true; data: CreateGerenteAuthUserResult } | { ok: false; errorMessage: string }
> {
  const loginCode = allocation.login_code

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: false,
    user_metadata: {
      nome: body.username,
      login_code: loginCode,
      razao_social: body.razaoSocial,
      cnpj: body.cnpj ?? null,
      role: 'gerente',
    },
    app_metadata: {
      role: 'gerente',
      company_id: allocation.company_id,
    },
  })

  if (createError || !created?.user?.id) {
    return {
      ok: false,
      errorMessage: createError?.message ?? 'Falha ao registrar usuario',
    }
  }

  return { ok: true, data: { userId: created.user.id } }
}

export async function compensateSignUpUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) {
    console.error('deleteAuthUser: rollback falhou', { userId, error })
  }
}
