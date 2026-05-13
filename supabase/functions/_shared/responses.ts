export function jsonHeaders(corsHeaders: Record<string, string>): Record<string, string> {
  return { ...corsHeaders, 'Content-Type': 'application/json' }
}

/** Padrão `create-vendedor` / `login-vendedor`: `{ error_code, message }`. */
export function structuredErrorResponse(
  headers: Record<string, string>,
  status: number,
  errorCode: string,
  message: string,
): Response {
  return new Response(
    JSON.stringify({
      error_code: errorCode,
      message,
    }),
    { status, headers },
  )
}

/** Padrão `register-gerente`: `{ error: string }`. */
export function flatErrorJsonResponse(
  headers: Record<string, string>,
  status: number,
  message: string,
): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers })
}

export function jsonResponse(
  headers: Record<string, string>,
  status: number,
  body: unknown,
): Response {
  return new Response(JSON.stringify(body), { status, headers })
}

export function optionsOkResponse(corsHeaders: Record<string, string>): Response {
  return new Response('ok', { headers: corsHeaders })
}
