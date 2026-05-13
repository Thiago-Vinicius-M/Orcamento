import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1?target=deno'

/**
 * Garante que o profile exista para o gerente recém-criado.
 *
 * O trigger `on_auth_user_created_gerente` cria o profile lendo
 * `raw_app_meta_data` (role, company_id) e `raw_user_meta_data` (nome) na
 * inserção do usuário (ex.: auth.admin.createUser). Este upsert serve como
 * rede de segurança caso o trigger tenha
 * engolido um erro via `raise warning` (o trigger usa `exception when others`
 * pra não derrubar o cadastro do usuário no GoTrue).
 */
export async function ensureGerenteProfile(
  supabaseAdmin: SupabaseClient,
  userId: string,
  companyId: string,
  nome: string,
): Promise<void> {
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
    {
      user_id: userId,
      company_id: companyId,
      role: 'gerente',
      nome: nome,
    },
    { onConflict: 'user_id' },
  )

  if (profileError) {
    console.error('ensureGerenteProfile: profile upsert failed', profileError)
    throw new Error(`Falha ao criar perfil: ${profileError.message}`)
  }
}
