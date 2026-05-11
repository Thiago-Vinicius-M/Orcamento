import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const serviceRoleKey =
  Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabaseAuth = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
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

function randomLoginCode(length = 10) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let code = ''

  for (let i = 0; i < length; i += 1) {
    code += alphabet[bytes[i] % alphabet.length]
  }

  return code
}

async function generateUniqueLoginCode(maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = randomLoginCode()
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('login_code', candidate)
      .limit(1)

    if (error) {
      throw new Error(`Erro ao validar login_code: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return candidate
    }
  }

  throw new Error('Não foi possível gerar um login_code único')
}

/**
 * Garante que company e profile existam para o gerente recém-criado.
 * Usa upsert (ON CONFLICT) para idempotência: se o trigger
 * handle_gerente_onboarding() já criou os registros, os INSERTs
 * são no-ops. Se o trigger falhou (exception handler), esta
 * função cria os registros que faltam.
 */
async function ensureCompanyAndProfile(
  userId: string,
  loginCode: string,
  razaoSocial: string,
  nome: string,
  cnpj: string | null,
) {
  const { data: companyData, error: companyError } = await supabaseAdmin
    .from('companies')
    .upsert(
      {
        razao_social: razaoSocial,
        cnpj: cnpj,
        login_code: loginCode,
      },
      { onConflict: 'login_code' },
    )
    .select('id')
    .single()

  if (companyError) {
    console.error('ensureCompanyAndProfile: company upsert failed', companyError)
    throw new Error(`Falha ao criar empresa: ${companyError.message}`)
  }

  const companyId = companyData.id

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
    console.error('ensureCompanyAndProfile: profile upsert failed', profileError)
    throw new Error(`Falha ao criar perfil: ${profileError.message}`)
  }

  return companyId
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

    const loginCode = await generateUniqueLoginCode()

    const { data, error } = await supabaseAuth.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        emailRedirectTo: body.emailRedirectTo,
        data: {
          login_code: loginCode,
          razao_social: body.razaoSocial,
          cnpj: body.cnpj ?? null,
          nome: body.username,
          role: 'gerente',
        },
      },
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: jsonHeaders,
      })
    }

    const userId = data.user?.id
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Usuário criado mas sem ID retornado' }),
        { status: 500, headers: jsonHeaders },
      )
    }

    // Fallback: se o trigger criou company/profile, os upserts são no-ops.
    // Se o trigger falhou (exception handler), esta chamada garante a criação.
    await ensureCompanyAndProfile(
      userId,
      loginCode,
      body.razaoSocial,
      body.username,
      body.cnpj ?? null,
    )

    return new Response(
      JSON.stringify({
        success: true,
        login_code: loginCode,
        user_id: userId,
        session: data.session,
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
