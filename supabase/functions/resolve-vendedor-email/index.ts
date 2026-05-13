import { corsHeadersPostOptionsGet } from '../_shared/cors.ts'
import { jsonHeaders, jsonResponse, optionsOkResponse } from '../_shared/responses.ts'

const cors = corsHeadersPostOptionsGet()
const jsonHdrs = jsonHeaders(cors)

const GONE_BODY = {
  error_code: 'ENDPOINT_DEPRECATED',
  message: 'Este endpoint foi descontinuado.',
} as const

/** Superfície legada removida: não consulta banco nem devolve dados sensíveis (410 Gone). */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsOkResponse(cors)
  }

  return jsonResponse(jsonHdrs, 410, GONE_BODY)
})
