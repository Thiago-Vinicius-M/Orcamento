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

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface LoginVendedorBody {
  company_code: string
  username: string
  password: string
}

/** Ignora campos extras no JSON (ex.: metadados enviados pelo cliente). */
function parseLoginVendedorBody(raw: unknown): Partial<LoginVendedorBody> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  return {
    company_code: typeof o.company_code === 'string' ? o.company_code : undefined,
    username: typeof o.username === 'string' ? o.username : undefined,
    password: typeof o.password === 'string' ? o.password : undefined,
  }
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

function errorResponse(status: number, errorCode: string, message: string) {
  return new Response(
    JSON.stringify({
      error_code: errorCode,
      message,
    }),
    {
      status,
      headers: jsonHeaders,
    },
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.')
  }

  try {
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return errorResponse(400, 'INVALID_PAYLOAD', 'Corpo JSON inválido.')
    }

    const parsed = parseLoginVendedorBody(rawBody)
    if (!parsed) {
      return errorResponse(400, 'INVALID_PAYLOAD', 'Campos obrigatórios ausentes.')
    }

    const companyCode = parsed.company_code?.trim() ?? ''
    const username = parsed.username ? normalizeUsername(parsed.username) : ''
    const password = parsed.password ?? ''

    if (!companyCode || !username || !password) {
      return errorResponse(400, 'INVALID_PAYLOAD', 'Campos obrigatórios ausentes.')
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('login_code', companyCode)
      .maybeSingle()

    if (companyError) {
      console.error('login-vendedor companyError', companyError)
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao validar empresa.')
    }

    // Anti-enumeração: mesmo status/código que credencial inválida (não revela se o código existe).
    if (!company) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.')
    }

    const { data: credential, error: credentialError } = await supabaseAdmin
      .from('vendedor_credentials')
      .select('auth_email, auth_user_id, user_id, active')
      .eq('company_id', company.id)
      .eq('username', username)
      .maybeSingle()

    if (credentialError) {
      console.error('login-vendedor credentialError', credentialError)
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao validar credenciais.')
    }

    if (!credential) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.')
    }

    if (credential.active === false) {
      return errorResponse(403, 'USER_INACTIVE', 'Usuário inativo.')
    }

    const authEmail = credential.auth_email
    if (!authEmail) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.')
    }

    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: authEmail,
      password,
    })

    if (signInError || !signInData.session || !signInData.user) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.')
    }

    const expectedUserId = credential.auth_user_id ?? credential.user_id
    if (expectedUserId && expectedUserId !== signInData.user.id) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.')
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', signInData.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('login-vendedor profileError', profileError)
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao validar perfil.')
    }

    if (!profile || profile.role !== 'vendedor' || profile.company_id !== company.id) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.')
    }

    return new Response(
      JSON.stringify({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_in: signInData.session.expires_in,
        token_type: signInData.session.token_type,
        user: {
          id: signInData.user.id,
          role: profile.role,
          company_id: profile.company_id,
        },
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    )
  } catch (error) {
    console.error('login-vendedor error', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno ao autenticar vendedor.')
  }
})
