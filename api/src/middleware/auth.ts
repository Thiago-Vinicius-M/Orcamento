import jwt from "jsonwebtoken"
import type { NextFunction, Request, Response } from "express"
import { supabase } from "../supabaseClient.js"
import { getJwtSecret } from "../config/jwt.js"

type JwtPayload = {
  userId: number
  empresaId: number | null
  email: string
  iat?: number
  exp?: number
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autenticado" })
  }

  const token = authHeader.substring("Bearer ".length)

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload

    if (!decoded || !decoded.userId || !decoded.email) {
      return res.status(401).json({ error: "Token inválido" })
    }

    const { data: appUser, error: appUserError } = await supabase
      .from("usuarios")
      .select("id, empresa_id, email")
      .eq("id", decoded.userId)
      .maybeSingle()

    if (appUserError) {
      console.error("Erro ao buscar usuário de aplicação no Supabase:", appUserError)
      return res
        .status(500)
        .json({ error: "Erro ao validar usuário da aplicação" })
    }

    if (!appUser) {
      return res.status(401).json({ error: "Usuário não encontrado na aplicação" })
    }

    req.user = {
      id: appUser.id as number,
      empresaId: (appUser.empresa_id ?? decoded.empresaId) as number,
      email: appUser.email ?? decoded.email,
    }

    return next()
  } catch (err) {
    console.error("Erro ao validar JWT do backend:", err)
    return res.status(401).json({ error: "Token inválido ou expirado" })
  }
}

