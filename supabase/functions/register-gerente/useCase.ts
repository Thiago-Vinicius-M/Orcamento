import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1?target=deno'
import type { RegisterGerenteBody } from '../_shared/validation.ts'
import { runRegisterGerenteSaga } from './saga.ts'

export type RegisterGerenteOutcome =
  | { status: 'ok'; login_code: string; user_id: string }
  | { status: 'bad_request'; message: string }
  | { status: 'internal_error'; cause?: unknown }

export async function executeRegisterGerenteUseCase(
  supabaseAdmin: SupabaseClient,
  body: RegisterGerenteBody,
): Promise<RegisterGerenteOutcome> {
  try {
    const result = await runRegisterGerenteSaga(supabaseAdmin, body)
    if (result.kind === 'success') {
      return {
        status: 'ok',
        login_code: result.login_code,
        user_id: result.user_id,
      }
    }
    return { status: 'bad_request', message: result.message }
  } catch (cause) {
    return { status: 'internal_error', cause }
  }
}
