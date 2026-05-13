import { corsHeadersPostOptions } from '../_shared/cors.ts'
import { createSupabaseAdminClient, getServiceRoleKey, getSupabaseUrl } from '../_shared/clients.ts'
import {
  jsonHeaders,
  jsonResponse,
  optionsOkResponse,
  structuredErrorResponse,
} from '../_shared/responses.ts'
import { parseCreateVendedorBody, tryParseJsonBody } from '../_shared/validation.ts'

const cors = corsHeadersPostOptions()
const jsonHdrs = jsonHeaders(cors)

const supabaseUrl = getSupabaseUrl()
const serviceRoleKey = getServiceRoleKey()

const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey)

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
    return optionsOkResponse(cors)
  }

  if (req.method !== 'POST') {
    return structuredErrorResponse(jsonHdrs, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed.')
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const jwt = authHeader?.replace('Bearer ', '')

    if (!jwt) {
      return structuredErrorResponse(jsonHdrs, 401, 'MISSING_AUTH', 'Autenticação obrigatória.')
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(jwt)

    if (authError || !user) {
      return structuredErrorResponse(jsonHdrs, 401, 'INVALID_SESSION', 'Sessão inválida ou expirada.')
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return structuredErrorResponse(jsonHdrs, 403, 'PROFILE_NOT_FOUND', 'Perfil não encontrado.')
    }

    if (profile.role !== 'gerente') {
      return structuredErrorResponse(jsonHdrs, 403, 'FORBIDDEN_ROLE', 'Apenas gerente pode criar vendedores.')
    }

    const parsed = await tryParseJsonBody(req)
    if (!parsed.ok) {
      return structuredErrorResponse(jsonHdrs, 400, 'INVALID_PAYLOAD', 'Corpo JSON inválido.')
    }

    const body = parseCreateVendedorBody(parsed.value)
    if (!body) {
      return structuredErrorResponse(
        jsonHdrs,
        400,
        'INVALID_PAYLOAD',
        'Campos obrigatórios ausentes ou inválidos.',
      )
    }

    const username = normalizeUsername(body.username)
    if (username.length < 3) {
      return structuredErrorResponse(
        jsonHdrs,
        400,
        'INVALID_PAYLOAD',
        'Usuário deve ter ao menos 3 caracteres.',
      )
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
      return structuredErrorResponse(jsonHdrs, 400, 'VENDOR_CREATE_FAILED', 'Não foi possível criar o vendedor.')
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
      return structuredErrorResponse(jsonHdrs, 500, 'INTERNAL_ERROR', 'Falha ao criar perfil do vendedor.')
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
      return structuredErrorResponse(jsonHdrs, 500, 'INTERNAL_ERROR', 'Falha ao salvar credenciais do vendedor.')
    }

    return jsonResponse(jsonHdrs, 200, {
      success: true,
      vendedor_id: newUser.user.id,
      username,
    })
  } catch (error) {
    console.error('create-vendedor error', error)
    return structuredErrorResponse(jsonHdrs, 500, 'INTERNAL_ERROR', 'Erro interno ao criar vendedor.')
  }
})
