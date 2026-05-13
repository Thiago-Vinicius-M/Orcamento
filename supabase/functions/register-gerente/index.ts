import { corsHeadersPostOptions } from '../_shared/cors.ts'
import {
  createSupabaseAdminClient,
  createSupabaseAnonClient,
  getAnonKey,
  getServiceRoleKey,
  getSupabaseUrl,
} from '../_shared/clients.ts'
import {
  flatErrorJsonResponse,
  jsonHeaders,
  jsonResponse,
  optionsOkResponse,
} from '../_shared/responses.ts'
import {
  isRegisterGerenteBodyComplete,
  parseRegisterGerenteBody,
} from '../_shared/validation.ts'
import { executeRegisterGerenteUseCase } from './useCase.ts'

const cors = corsHeadersPostOptions()
const jsonHdrs = jsonHeaders(cors)

const supabaseUrl = getSupabaseUrl()
const serviceRoleKey = getServiceRoleKey()
const anonKey = getAnonKey()

const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey)
const supabaseAnon = createSupabaseAnonClient(supabaseUrl, anonKey)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsOkResponse(cors)
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: jsonHdrs,
    })
  }

  try {
    const body = parseRegisterGerenteBody((await req.json()) as unknown)
    if (!body || !isRegisterGerenteBodyComplete(body)) {
      return flatErrorJsonResponse(jsonHdrs, 400, 'Campos obrigatórios ausentes')
    }

    const outcome = await executeRegisterGerenteUseCase(supabaseAdmin, supabaseAnon, body)

    if (outcome.status === 'bad_request') {
      return flatErrorJsonResponse(jsonHdrs, 400, outcome.message)
    }

    if (outcome.status === 'internal_error') {
      console.error('register-gerente error', outcome.cause)
      return flatErrorJsonResponse(jsonHdrs, 500, 'Erro interno ao registrar gerente')
    }

    return jsonResponse(jsonHdrs, 200, {
      success: true,
      login_code: outcome.login_code,
      user_id: outcome.user_id,
      session: null,
    })
  } catch (error) {
    console.error('register-gerente error', error)
    return flatErrorJsonResponse(jsonHdrs, 500, 'Erro interno ao registrar gerente')
  }
})
