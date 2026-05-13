import { createContext } from 'react'
import type { AuthSessionApi } from './authSessionTypes'

export const AuthSessionContext = createContext<AuthSessionApi | null>(null)
