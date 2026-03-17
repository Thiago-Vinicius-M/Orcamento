import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Empresa, Usuario } from "@/types"
import { clearStoredAuth, getStoredAuth, storeAuth } from "@/lib/auth"

interface AuthState {
  user: Usuario | null
  empresa: Empresa | null
  token: string | null
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean
  login: (data: { token: string; usuario: Usuario; empresa: Empresa }) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    empresa: null,
    token: null,
  })

  useEffect(() => {
    const stored = getStoredAuth()
    if (stored) {
      setState({
        user: stored.usuario,
        empresa: stored.empresa,
        token: stored.token,
      })
    }
  }, [])

  const login: AuthContextValue["login"] = (data) => {
    setState({
      user: data.usuario,
      empresa: data.empresa,
      token: data.token,
    })
    storeAuth({
      token: data.token,
      usuario: data.usuario,
      empresa: data.empresa,
    })
  }

  const logout = () => {
    setState({
      user: null,
      empresa: null,
      token: null,
    })
    clearStoredAuth()
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: !!state.token,
      login,
      logout,
    }),
    [state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider")
  }
  return ctx
}

