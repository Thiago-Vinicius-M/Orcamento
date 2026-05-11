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

interface CreateVendedorBody {
  nome: string
  username: string
  password: string
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

/** Aceita apenas campos conhecidos; ignora `company_id` e outros extras no JSON. */
function parseCreateVendedorBody(raw: unknown): CreateVendedorBody | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const nome = typeof o.nome === 'string' ? o.nome : ''
  const username = typeof o.username === 'string' ? o.username : ''
  const password = typeof o.password === 'string' ? o.password : ''
  if (!nome.trim() || !username.trim() || !password) return null
  return { nome: nome.trim(), username, password }
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

function generateSellerEmail(username: string) {
  const slug = username.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)
  const random = crypto.randomUUID().split('-')[0]
  // Domínio sintético mas com TLD aceito por validadores de e-mail do Auth (evita rejeição de `.local`).
  return `seller_${slug}_${random}@example.com`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.')
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const jwt = authHeader?.replace('Bearer ', '')

    if (!jwt) {
      return errorResponse(401, 'MISSING_AUTH', 'Autenticação obrigatória.')
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(jwt)

    if (authError || !user) {
      return errorResponse(401, 'INVALID_SESSION', 'Sessão inválida ou expirada.')
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return errorResponse(403, 'PROFILE_NOT_FOUND', 'Perfil não encontrado.')
    }

    if (profile.role !== 'gerente') {
      return errorResponse(403, 'FORBIDDEN_ROLE', 'Apenas gerente pode criar vendedores.')
    }

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return errorResponse(400, 'INVALID_PAYLOAD', 'Corpo JSON inválido.')
    }

    const body = parseCreateVendedorBody(rawBody)
    if (!body) {
      return errorResponse(400, 'INVALID_PAYLOAD', 'Campos obrigatórios ausentes ou inválidos.')
    }

    const username = normalizeUsername(body.username)
    if (username.length < 3) {
      return errorResponse(400, 'INVALID_PAYLOAD', 'Usuário deve ter ao menos 3 caracteres.')
    }

    const authEmail = generateSellerEmail(username)

    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        nome: body.nome,
        role: 'vendedor',
        company_id: profile.company_id,
      },
    })

    if (createUserError || !newUser.user) {
      console.error('create-vendedor createUserError', createUserError)
      return errorResponse(400, 'VENDOR_CREATE_FAILED', 'Não foi possível criar o vendedor.')
    }

    // O trigger `ensure_vendedor_credential_consistency` exige que `profiles` exista antes de
    // `vendedor_credentials` (cada insert via PostgREST é transação própria; ordem importa).
    const { error: insertProfileError } = await supabaseAdmin.from('profiles').insert({
      user_id: newUser.user.id,
      company_id: profile.company_id,
      role: 'vendedor',
      nome: body.nome,
    })

    if (insertProfileError) {
      console.error('create-vendedor insertProfileError', insertProfileError)
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao criar perfil do vendedor.')
    }

    const { error: insertCredsError } = await supabaseAdmin.from('vendedor_credentials').insert({
      company_id: profile.company_id,
      username,
      auth_email: authEmail,
      auth_user_id: newUser.user.id,
      user_id: newUser.user.id,
      active: true,
    })

    if (insertCredsError) {
      console.error('create-vendedor insertCredsError', insertCredsError)
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao salvar credenciais do vendedor.')
    }

    return new Response(
      JSON.stringify({
        success: true,
        vendedor_id: newUser.user.id,
        username,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    )
  } catch (error) {
    console.error('create-vendedor error', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno ao criar vendedor.')
  }
})
