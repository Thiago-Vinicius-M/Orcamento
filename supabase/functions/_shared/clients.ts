import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1?target=deno'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1?target=deno'

export function getSupabaseUrl(): string {
  return Deno.env.get('SUPABASE_URL') ?? ''
}

export function getServiceRoleKey(): string {
  return Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
}

export function getAnonKey(): string {
  return Deno.env.get('SUPABASE_ANON_KEY') ?? ''
}

export function createSupabaseAdminClient(
  supabaseUrl: string,
  serviceRoleKey: string,
): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/** Usado por `register-gerente` para `auth.resend` (confirmação de e-mail). */
export function createSupabaseAnonClient(supabaseUrl: string, anonKey: string): SupabaseClient {
  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
