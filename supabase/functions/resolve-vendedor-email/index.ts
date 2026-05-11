const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

const GONE_BODY = JSON.stringify({
  error_code: 'ENDPOINT_DEPRECATED',
  message: 'Este endpoint foi descontinuado.',
})

/** Superfície legada removida: não consulta banco nem devolve dados sensíveis (410 Gone). */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return new Response(GONE_BODY, {
    status: 410,
    headers: jsonHeaders,
  })
})
