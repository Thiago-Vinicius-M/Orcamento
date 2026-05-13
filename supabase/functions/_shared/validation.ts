export async function tryParseJsonBody(
  req: Request,
): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    const value = await req.json()
    return { ok: true, value }
  } catch {
    return { ok: false }
  }
}

export interface CreateVendedorBody {
  nome: string
  username: string
  password: string
}

/** Aceita apenas campos conhecidos; ignora `company_id` e outros extras no JSON. */
export function parseCreateVendedorBody(raw: unknown): CreateVendedorBody | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const nome = typeof o.nome === 'string' ? o.nome : ''
  const username = typeof o.username === 'string' ? o.username : ''
  const password = typeof o.password === 'string' ? o.password : ''
  if (!nome.trim() || !username.trim() || !password) return null
  return { nome: nome.trim(), username, password }
}

export interface LoginVendedorBody {
  company_code: string
  username: string
  password: string
}

/** Ignora campos extras no JSON (ex.: metadados enviados pelo cliente). */
export function parseLoginVendedorBody(raw: unknown): Partial<LoginVendedorBody> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  return {
    company_code: typeof o.company_code === 'string' ? o.company_code : undefined,
    username: typeof o.username === 'string' ? o.username : undefined,
    password: typeof o.password === 'string' ? o.password : undefined,
  }
}

export interface RegisterGerenteBody {
  razaoSocial: string
  cnpj?: string
  username: string
  email: string
  password: string
  emailRedirectTo?: string
}

export function parseRegisterGerenteBody(raw: unknown): Partial<RegisterGerenteBody> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  return {
    razaoSocial: typeof o.razaoSocial === 'string' ? o.razaoSocial : undefined,
    cnpj: typeof o.cnpj === 'string' ? o.cnpj : undefined,
    username: typeof o.username === 'string' ? o.username : undefined,
    email: typeof o.email === 'string' ? o.email : undefined,
    password: typeof o.password === 'string' ? o.password : undefined,
    emailRedirectTo: typeof o.emailRedirectTo === 'string' ? o.emailRedirectTo : undefined,
  }
}

export function isRegisterGerenteBodyComplete(
  body: Partial<RegisterGerenteBody>,
): body is RegisterGerenteBody {
  return Boolean(
    body.razaoSocial &&
      body.username &&
      body.email &&
      body.password,
  )
}
