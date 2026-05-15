import { corsHeadersPostOptions } from '../_shared/cors.ts'
import { createSupabaseAdminClient, getServiceRoleKey, getSupabaseUrl } from '../_shared/clients.ts'
import {
  jsonHeaders,
  jsonResponse,
  optionsOkResponse,
  structuredErrorResponse,
} from '../_shared/responses.ts'
import { tryParseJsonBody } from '../_shared/validation.ts'

const cors = corsHeadersPostOptions()
const jsonHdrs = jsonHeaders(cors)

const supabaseUrl = getSupabaseUrl()
const serviceRoleKey = getServiceRoleKey()

const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey)

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
      return structuredErrorResponse(jsonHdrs, 403, 'FORBIDDEN_ROLE', 'Apenas gerente pode gerenciar vendedores.')
    }

    const parsed = await tryParseJsonBody(req)
    if (!parsed.ok) {
      return structuredErrorResponse(jsonHdrs, 400, 'INVALID_PAYLOAD', 'Corpo JSON inválido.')
    }

    const body = parsed.value as Record<string, unknown>
    const vendedorUserId = typeof body.vendedor_user_id === 'string' ? body.vendedor_user_id.trim() : ''

    if (!vendedorUserId) {
      return structuredErrorResponse(jsonHdrs, 400, 'INVALID_PAYLOAD', 'Campo vendedor_user_id é obrigatório.')
    }

    const { data: cred, error: credError } = await supabaseAdmin
      .from('vendedor_credentials')
      .select('auth_user_id')
      .eq('company_id', profile.company_id)
      .eq('auth_user_id', vendedorUserId)
      .maybeSingle()

    if (credError) {
      console.error('update-vendedor credError', credError)
      return structuredErrorResponse(jsonHdrs, 500, 'INTERNAL_ERROR', 'Falha interna ao verificar vendedor.')
    }

    if (!cred) {
      return structuredErrorResponse(jsonHdrs, 403, 'VENDOR_NOT_IN_COMPANY', 'Vendedor não pertence a esta empresa.')
    }

    const nome = typeof body.nome === 'string' ? body.nome.trim() : null
    const newPassword = typeof body.new_password === 'string' ? body.new_password : null

    if (!nome && !newPassword) {
      return structuredErrorResponse(jsonHdrs, 400, 'INVALID_PAYLOAD', 'Informe nome ou new_password para atualizar.')
    }

    if (nome) {
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ nome })
        .eq('user_id', vendedorUserId)

      if (updateProfileError) {
        console.error('update-vendedor updateProfileError', updateProfileError)
        return structuredErrorResponse(jsonHdrs, 500, 'UPDATE_FAILED', 'Falha ao atualizar nome do vendedor.')
      }
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return structuredErrorResponse(jsonHdrs, 400, 'PASSWORD_TOO_SHORT', 'A senha deve ter no mínimo 6 caracteres.')
      }

      const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
        vendedorUserId,
        { password: newPassword },
      )

      if (updatePasswordError) {
        console.error('update-vendedor updatePasswordError', updatePasswordError)
        return structuredErrorResponse(jsonHdrs, 500, 'PASSWORD_UPDATE_FAILED', 'Falha ao alterar senha do vendedor.')
      }
    }

    return jsonResponse(jsonHdrs, 200, { success: true })
  } catch (error) {
    console.error('update-vendedor error', error)
    return structuredErrorResponse(jsonHdrs, 500, 'INTERNAL_ERROR', 'Erro interno ao atualizar vendedor.')
  }
})
