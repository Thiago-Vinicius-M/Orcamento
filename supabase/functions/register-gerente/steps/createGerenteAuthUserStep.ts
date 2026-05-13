import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1?target=deno'
import type { RegisterGerenteBody } from '../../_shared/validation.ts'
import type { CompanyAllocation } from './allocateCompanyStep.ts'

export interface CreateGerenteAuthUserResult {
  userId: string
}

/**
 * Cria o usuário no GoTrue com service_role num único passo (app_metadata + user_metadata),
 * evitando admin.updateUserById logo após signUp (janela / mismatch de projeto → "User not found").
 *
 * Confirmação de e-mail: `createUser` não dispara mailer; usamos `auth.resend` no cliente anon
 * quando `emailRedirectTo` vem no body (equivalente ao fluxo anterior com signUp).
 */
export async function createGerenteAuthUser(
  supabaseAdmin: SupabaseClient,
  supabaseAnon: SupabaseClient,
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

  const userId = created.user.id

  if (body.emailRedirectTo) {
    const { error: resendError } = await supabaseAnon.auth.resend({
      type: 'signup',
      email: body.email,
      options: { emailRedirectTo: body.emailRedirectTo },
    })

    if (resendError) {
      console.error('register-gerente: resend signup confirmation failed', resendError)
      const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteErr) {
        console.error('register-gerente: rollback deleteUser after resend failed', deleteErr)
      }
      return { ok: false, errorMessage: resendError.message }
    }
  }

  return { ok: true, data: { userId } }
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
