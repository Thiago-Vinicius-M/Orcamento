import "express"

declare global {
  namespace Express {
    interface AuthUser {
      id: number
      empresaId: number
      email: string
    }

    interface Request {
      user?: AuthUser
    }
  }
}

export {}

