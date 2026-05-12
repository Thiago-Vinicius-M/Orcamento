import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey =
  Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Cliente "publico" (anon key) necessario para chamar /signup, que e a unica
// rota do GoTrue/Supabase Auth que efetivamente dispara o mailer de
// confirmacao. `admin.createUser` + `admin.generateLink` retornam o link mas
// NAO enviam o e-mail (comportamento confirmado pela duracao das requisicoes
// nos logs do Auth: /signup leva ~3s -> handshake SMTP; /admin/generate_link
// leva ~30ms -> apenas gera o link).
const supabaseAnon = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface RegisterGerenteBody {
  razaoSocial: string
  cnpj?: string
  username: string
  email: string
  password: string
  emailRedirectTo?: string
}

interface CompanyAllocation {
  company_id: string
  login_code: string
}

async function createCompanyWithNextLoginCode(
  razaoSocial: string,
  cnpj: string | null,
) {
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

async function deleteCompany(companyId: string) {
  const { error } = await supabaseAdmin
    .from('companies')
    .delete()
    .eq('id', companyId)
  if (error) {
    console.error('deleteCompany: rollback falhou', { companyId, error })
  }
}

async function deleteAuthUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) {
    console.error('deleteAuthUser: rollback falhou', { userId, error })
  }
}

/**
 * Garante que o profile exista para o gerente recém-criado.
 *
 * O trigger `on_auth_user_created_gerente` cria o profile lendo
 * `raw_user_meta_data` (nome, razao_social, login_code, role) durante o
 * `signUp`. Este upsert serve como rede de segurança caso o trigger tenha
 * engolido um erro via `raise warning` (o trigger usa `exception when others`
 * pra não derrubar o cadastro do usuário no GoTrue).
 */
async function ensureGerenteProfile(userId: string, companyId: string, nome: string) {
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: jsonHeaders,
    })
  }

  try {
    const body = (await req.json()) as Partial<RegisterGerenteBody>

    if (!body.razaoSocial || !body.username || !body.email || !body.password) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes' }), {
        status: 400,
        headers: jsonHeaders,
      })
    }

    // 1) Aloca o login_code sequencial criando a company. Em caso de falha em
    //    qualquer passo abaixo, fazemos rollback (delete) desta company para
    //    não deixar buraco na numeração com "lixo" sem gerente associado.
    const companyAllocation = await createCompanyWithNextLoginCode(
      body.razaoSocial,
      body.cnpj ?? null,
    )
    const loginCode = companyAllocation.login_code
    const companyId = companyAllocation.company_id

    // 2) Cadastra o gerente pela rota PUBLICA /signup (via anon client).
    //    Essa e a unica rota do GoTrue que dispara automaticamente o mailer
    //    de "Confirm sign up" via SMTP configurado em Auth -> SMTP. As rotas
    //    de admin (`/admin/users` e `/admin/generate_link`) geram tokens mas
    //    NAO enviam e-mail (comportamento documentado do GoTrue).
    //
    //    Propaga em `options.data` (= raw_user_meta_data):
    //      - `nome`, `razao_social`, `cnpj`, `login_code`: usados pela trigger
    //        `handle_gerente_onboarding` para criar/anexar o profile a
    //        `companies.login_code = loginCode` (que ja foi alocada no passo 1).
    //      - `role: 'gerente'`: garante que a trigger nao confunda o usuario
    //        com um vendedor.
    //      - `login_code` tambem aparece no template via `{{ .Data.login_code }}`.
    const { data: signUpData, error: signUpError } =
      await supabaseAnon.auth.signUp({
        email: body.email,
        password: body.password,
        options: {
          data: {
            nome: body.username,
            login_code: loginCode,
            razao_social: body.razaoSocial,
            cnpj: body.cnpj ?? null,
            role: 'gerente',
          },
          emailRedirectTo: body.emailRedirectTo,
        },
      })

    if (signUpError || !signUpData?.user?.id) {
      await deleteCompany(companyId)
      return new Response(
        JSON.stringify({
          error: signUpError?.message ?? 'Falha ao registrar usuario',
        }),
        { status: 400, headers: jsonHeaders },
      )
    }

    const userId = signUpData.user.id

    // 3) `app_metadata` so e gravavel pelo service_role: setamos `role` +
    //    `company_id` aqui para que o JWT do gerente carregue essas claims
    //    (defesa em profundidade — politicas RLS leem de `public.profiles`
    //    via RPC, mas mantemos o JWT consistente).
    const { error: updateMetaError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          role: 'gerente',
          company_id: companyId,
        },
      },
    )

    if (updateMetaError) {
      console.error('register-gerente: updateUserById app_metadata failed', updateMetaError)
      await deleteAuthUser(userId)
      await deleteCompany(companyId)
      return new Response(JSON.stringify({ error: updateMetaError.message }), {
        status: 400,
        headers: jsonHeaders,
      })
    }

    // 4) Defesa em profundidade: garante o profile mesmo se a trigger
    //    tiver engolido um erro via `raise warning`.
    try {
      await ensureGerenteProfile(userId, companyId, body.username)
    } catch (profileError) {
      await deleteAuthUser(userId)
      await deleteCompany(companyId)
      throw profileError
    }

    return new Response(
      JSON.stringify({
        success: true,
        login_code: loginCode,
        user_id: userId,
        session: null,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    )
  } catch (error) {
    console.error('register-gerente error', error)
    return new Response(JSON.stringify({ error: 'Erro interno ao registrar gerente' }), {
      status: 500,
      headers: jsonHeaders,
    })
  }
})
