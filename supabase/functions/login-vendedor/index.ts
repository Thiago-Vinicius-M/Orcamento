import { corsHeadersPostOptions } from '../_shared/cors.ts'
import { createSupabaseAdminClient, getServiceRoleKey, getSupabaseUrl } from '../_shared/clients.ts'
import {
  jsonHeaders,
  jsonResponse,
  optionsOkResponse,
  structuredErrorResponse,
} from '../_shared/responses.ts'
import { parseLoginVendedorBody, tryParseJsonBody } from '../_shared/validation.ts'

const cors = corsHeadersPostOptions()
const jsonHdrs = jsonHeaders(cors)

const supabaseUrl = getSupabaseUrl()
const serviceRoleKey = getServiceRoleKey()

const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey)

function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsOkResponse(cors)
  }

  if (req.method !== 'POST') {
    return structuredErrorResponse(jsonHdrs, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed.')
  }

  try {
    const parsed = await tryParseJsonBody(req)
    if (!parsed.ok) {
      return structuredErrorResponse(jsonHdrs, 400, 'INVALID_PAYLOAD', 'Corpo JSON inválido.')
    }

    const rawParsed = parseLoginVendedorBody(parsed.value)
    if (!rawParsed) {
      return structuredErrorResponse(jsonHdrs, 400, 'INVALID_PAYLOAD', 'Campos obrigatórios ausentes.')
    }

    const companyCode = rawParsed.company_code?.trim() ?? ''
    const username = rawParsed.username ? normalizeUsername(rawParsed.username) : ''
    const password = rawParsed.password ?? ''

    if (!companyCode || !username || !password) {
      return structuredErrorResponse(jsonHdrs, 400, 'INVALID_PAYLOAD', 'Campos obrigatórios ausentes.')
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('login_code', companyCode)
      .maybeSingle()

    if (companyError) {
      console.error('login-vendedor companyError', companyError)
      return structuredErrorResponse(jsonHdrs, 500, 'INTERNAL_ERROR', 'Falha interna ao validar empresa.')
    }

    // Anti-enumeração: mesmo status/código que credencial inválida (não revela se o código existe).
    if (!company) {
      return structuredErrorResponse(jsonHdrs, 401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.')
    }

    const { data: credential, error: credentialError } = await supabaseAdmin
      .from('vendedor_credentials')
      .select('auth_email, auth_user_id, user_id, active')
      .eq('company_id', company.id)
      .eq('username', username)
      .maybeSingle()

    if (credentialError) {
      console.error('login-vendedor credentialError', credentialError)
      return structuredErrorResponse(jsonHdrs, 500, 'INTERNAL_ERROR', 'Falha interna ao validar credenciais.')
    }

    if (!credential) {
      return structuredErrorResponse(jsonHdrs, 401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.')
    }

    if (credential.active === false) {
      return structuredErrorResponse(jsonHdrs, 403, 'USER_INACTIVE', 'Usuário inativo.')
    }

    const authEmail = credential.auth_email
    if (!authEmail) {
      return structuredErrorResponse(jsonHdrs, 401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.')
    }

    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: authEmail,
      password,
    })

    if (signInError || !signInData.session || !signInData.user) {
      return structuredErrorResponse(jsonHdrs, 401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.')
    }

    const expectedUserId = credential.auth_user_id ?? credential.user_id
    if (expectedUserId && expectedUserId !== signInData.user.id) {
      return structuredErrorResponse(jsonHdrs, 401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.')
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', signInData.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('login-vendedor profileError', profileError)
      return structuredErrorResponse(jsonHdrs, 500, 'INTERNAL_ERROR', 'Falha interna ao validar perfil.')
    }

    if (!profile || profile.role !== 'vendedor' || profile.company_id !== company.id) {
      return structuredErrorResponse(jsonHdrs, 401, 'INVALID_CREDENTIALS', 'Usuário ou senha inválidos.')
    }

    return jsonResponse(jsonHdrs, 200, {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_in: signInData.session.expires_in,
      token_type: signInData.session.token_type,
      user: {
        id: signInData.user.id,
        role: profile.role,
        company_id: profile.company_id,
      },
    })
  } catch (error) {
    console.error('login-vendedor error', error)
    return structuredErrorResponse(jsonHdrs, 500, 'INTERNAL_ERROR', 'Erro interno ao autenticar vendedor.')
  }
})
