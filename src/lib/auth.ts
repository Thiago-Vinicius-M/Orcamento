import type { Empresa, Usuario } from "@/types"

export const AUTH_TOKEN_KEY = "authToken"
export const AUTH_USER_KEY = "authUser"
export const AUTH_EMPRESA_KEY = "authEmpresa"
const AUTH_REDIRECT_KEY = "authRedirectPath"

export interface StoredAuth {
  token: string
  usuario: Usuario
  empresa: Empresa
}

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null

  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    const rawUser = window.localStorage.getItem(AUTH_USER_KEY)
    const rawEmpresa = window.localStorage.getItem(AUTH_EMPRESA_KEY)

    if (!token || !rawUser || !rawEmpresa) return null

    const usuario = JSON.parse(rawUser) as Usuario
    const empresa = JSON.parse(rawEmpresa) as Empresa

    return { token, usuario, empresa }
  } catch {
    clearStoredAuth()
    return null
  }
}

export function storeAuth(data: StoredAuth): void {
  if (typeof window === "undefined") return

  window.localStorage.setItem(AUTH_TOKEN_KEY, data.token)
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.usuario))
  window.localStorage.setItem(AUTH_EMPRESA_KEY, JSON.stringify(data.empresa))
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return

  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_USER_KEY)
  window.localStorage.removeItem(AUTH_EMPRESA_KEY)
  window.localStorage.removeItem(AUTH_REDIRECT_KEY)
}

export function setAuthRedirectPath(path: string | null): void {
  if (typeof window === "undefined") return
  if (!path || path === "/login") {
    window.localStorage.removeItem(AUTH_REDIRECT_KEY)
    return
  }
  window.localStorage.setItem(AUTH_REDIRECT_KEY, path)
}

export function consumeAuthRedirectPath(): string | null {
  if (typeof window === "undefined") return null
  const value = window.localStorage.getItem(AUTH_REDIRECT_KEY)
  if (value) {
    window.localStorage.removeItem(AUTH_REDIRECT_KEY)
  }
  return value
}

