import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1?target=deno'
import type { RegisterGerenteBody } from '../_shared/validation.ts'
import { allocateCompany, compensateAllocateCompany } from './steps/allocateCompanyStep.ts'
import {
  compensateSignUpUser,
  createGerenteAuthUser,
} from './steps/createGerenteAuthUserStep.ts'
import { ensureGerenteProfile } from './steps/ensureProfileStep.ts'

export type RegisterGerenteSagaSuccess = {
  kind: 'success'
  login_code: string
  user_id: string
}

export type RegisterGerenteSagaResult =
  | RegisterGerenteSagaSuccess
  | { kind: 'bad_request'; message: string }

async function runUndoStack(stack: Array<() => Promise<void>>): Promise<void> {
  for (const fn of [...stack].reverse()) {
    await fn()
  }
}

/**
 * Orquestra cadastro de gerente com rollback na ordem espelhada do handler legado.
 */
export async function runRegisterGerenteSaga(
  supabaseAdmin: SupabaseClient,
  supabaseAnon: SupabaseClient,
  body: RegisterGerenteBody,
): Promise<RegisterGerenteSagaResult> {
  const undo: Array<() => Promise<void>> = []

  const allocation = await allocateCompany(
    supabaseAdmin,
    body.razaoSocial,
    body.cnpj ?? null,
  )
  undo.push(() => compensateAllocateCompany(supabaseAdmin, allocation.company_id))

  const authResult = await createGerenteAuthUser(supabaseAdmin, supabaseAnon, body, allocation)
  if (!authResult.ok) {
    await runUndoStack(undo)
    return { kind: 'bad_request', message: authResult.errorMessage }
  }

  const { userId } = authResult.data
  undo.push(() => compensateSignUpUser(supabaseAdmin, userId))

  try {
    await ensureGerenteProfile(supabaseAdmin, userId, allocation.company_id, body.username)
  } catch (profileError) {
    await runUndoStack(undo)
    throw profileError
  }

  return {
    kind: 'success',
    login_code: allocation.login_code,
    user_id: userId,
  }
}
