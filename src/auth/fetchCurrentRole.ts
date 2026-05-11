import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '../types/userRole'

export type FetchCurrentRoleResult =
  | { ok: true; role: UserRole }
  | { ok: false; message: string }

export async function fetchCurrentRole(client: SupabaseClient): Promise<FetchCurrentRoleResult> {
  const { data, error } = await client.rpc('current_role')

  if (error) {
    return {
      ok: false,
      message: error.message?.trim() || 'Não foi possível validar seu perfil.',
    }
  }

  if (data === 'gerente' || data === 'vendedor') {
    return { ok: true, role: data }
  }

  return { ok: false, message: 'Perfil inválido ou sem permissão.' }
}
