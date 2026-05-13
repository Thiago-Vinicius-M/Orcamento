const BASE = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
} as const

/** POST + OPTIONS (maioria das funções). */
export function corsHeadersPostOptions(): Record<string, string> {
  return {
    ...BASE,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

/** POST + OPTIONS + GET (`resolve-vendedor-email` legado). */
export function corsHeadersPostOptionsGet(): Record<string, string> {
  return {
    ...BASE,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  }
}
