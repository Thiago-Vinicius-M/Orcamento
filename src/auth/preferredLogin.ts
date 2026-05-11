export const PREFERRED_LOGIN_STORAGE_KEY = 'neworca_preferred_login'

export type PreferredLogin = 'gerente' | 'vendedor'

export function getPreferredLoginKind(): PreferredLogin | null {
  try {
    const v = sessionStorage.getItem(PREFERRED_LOGIN_STORAGE_KEY)
    if (v === 'vendedor' || v === 'gerente') return v
  } catch {
    /* ignore */
  }
  return null
}

export function getPreferredLoginPath(): '/login-gerente' | '/login-vendedor' {
  return getPreferredLoginKind() === 'vendedor' ? '/login-vendedor' : '/login-gerente'
}

export function setPreferredLogin(kind: PreferredLogin) {
  try {
    sessionStorage.setItem(PREFERRED_LOGIN_STORAGE_KEY, kind)
  } catch {
    /* ignore */
  }
}
