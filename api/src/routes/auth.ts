import { Router } from "express"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { supabase } from "../supabaseClient.js"
import { sendConfirmationEmail } from "../services/email.js"
import { getJwtSecret } from "../config/jwt.js"

const router = Router()

function getAppUrl(): string {
  const url = process.env.APP_URL ?? "http://localhost:5173"
  return url.endsWith("/") ? url.slice(0, -1) : url
}

router.post("/cadastro", async (req, res, next) => {
  try {
    const { email, nomeEmpresa, cnpj, telefone, endereco } = req.body as {
      email?: string
      nomeEmpresa?: string
      cnpj?: string
      telefone?: string
      endereco?: string
    }

    if (!email) {
      return res.status(400).json({ error: "E-mail é obrigatório" })
    }

    if (!nomeEmpresa || !cnpj) {
      return res.status(400).json({
        error: "nomeEmpresa e cnpj são obrigatórios para cadastro",
      })
    }

    const { data: existingUser, error: existingUserError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existingUserError) {
      console.error("Erro ao verificar usuário existente no Supabase:", existingUserError)
      return res.status(500).json({ error: "Erro ao verificar usuário existente" })
    }

    if (existingUser) {
      return res.status(400).json({ error: "E-mail já cadastrado" })
    }

    const confirmationToken = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .insert({
        nome: nomeEmpresa,
        cnpj,
        email,
        telefone: telefone ?? "",
        endereco: endereco ?? "",
      })
      .select("*")
      .maybeSingle()

    if (empresaError || !empresa) {
      console.error("Erro ao criar empresa no Supabase:", empresaError)
      return res.status(500).json({ error: "Erro ao criar empresa" })
    }

    const { error: usuarioError } = await supabase.from("usuarios").insert({
      email,
      empresa_id: empresa.id,
      email_confirmation_token: confirmationToken,
      email_confirmation_expires_at: expiresAt.toISOString(),
    })

    if (usuarioError) {
      console.error("Erro ao criar usuário no Supabase:", usuarioError)
      return res.status(500).json({ error: "Erro ao criar usuário" })
    }

    const { error: lojaError } = await supabase.from("lojas").insert({
      nome: empresa.nome,
      cnpj: empresa.cnpj,
      endereco: empresa.endereco,
      telefone: empresa.telefone,
      email: empresa.email,
      logo: "",
      empresa_id: empresa.id,
    })

    if (lojaError) {
      console.error("Erro ao criar loja padrão para empresa no Supabase:", lojaError)
    }

    const appUrl = getAppUrl()
    const link = `${appUrl}/auth/definir-senha?token=${confirmationToken}`

    try {
      await sendConfirmationEmail(email, link)
    } catch (emailErr) {
      console.error(
        "Falha ao enviar e-mail de confirmação (cadastro já foi criado):",
        emailErr,
      )
    }

    return res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.post("/definir-senha", async (req, res, next) => {
  try {
    const { token, senha } = req.body as { token?: string; senha?: string }

    if (!token || !senha) {
      return res.status(400).json({ error: "Token e senha são obrigatórios" })
    }

    if (senha.length < 6) {
      return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres" })
    }

    const { data: user, error: userError } = await supabase
      .from("usuarios")
      .select(
        "id, email, empresa_id, password_hash, email_confirmation_token, email_confirmation_expires_at",
      )
      .eq("email_confirmation_token", token)
      .maybeSingle()

    if (userError) {
      console.error("Erro ao buscar usuário por token no Supabase:", userError)
      return res.status(500).json({ error: "Erro ao buscar usuário" })
    }

    if (
      !user ||
      !user.email_confirmation_expires_at ||
      new Date(user.email_confirmation_expires_at) < new Date()
    ) {
      return res.status(400).json({ error: "Token inválido ou expirado" })
    }

    const passwordHash = await bcrypt.hash(senha, 10)

    const { error: updateError } = await supabase
      .from("usuarios")
      .update({
        password_hash: passwordHash,
        email_confirmation_token: null,
        email_confirmation_expires_at: null,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Erro ao atualizar senha no Supabase:", updateError)
      return res.status(500).json({ error: "Erro ao definir senha" })
    }

    return res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.post("/login", async (req, res, next) => {
  try {
    const { email, senha } = req.body as { email?: string; senha?: string }

    if (!email || !senha) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios" })
    }

    const { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("id, email, nome, empresa_id, password_hash")
      .eq("email", email)
      .maybeSingle()

    if (userError) {
      console.error("Erro ao buscar usuário no Supabase:", userError)
      return res.status(500).json({ error: "Erro ao buscar usuário" })
    }

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "E-mail ou senha inválidos" })
    }

    const senhaValida = await bcrypt.compare(senha, user.password_hash)
    if (!senhaValida) {
      return res.status(401).json({ error: "E-mail ou senha inválidos" })
    }

    const jwtToken = jwt.sign(
      {
        userId: user.id,
        empresaId: user.empresa_id,
        email: user.email,
      },
      getJwtSecret(),
      { expiresIn: "7d" },
    )

    let empresaSafe:
      | {
          id: number
          nome: string
          cnpj: string
          email: string
          telefone: string
          endereco: string
        }
      | null = null

    if (user.empresa_id != null) {
      const { data: empresa, error: empresaError } = await supabase
        .from("empresas")
        .select("id, nome, cnpj, email, telefone, endereco")
        .eq("id", user.empresa_id)
        .maybeSingle()

      if (empresaError) {
        console.error("Erro ao buscar empresa no Supabase:", empresaError)
      } else if (empresa) {
        empresaSafe = {
          id: empresa.id,
          nome: empresa.nome,
          cnpj: empresa.cnpj,
          email: empresa.email,
          telefone: empresa.telefone,
          endereco: empresa.endereco,
        }
      }
    }

    return res.json({
      token: jwtToken,
      usuario: {
        id: user.id,
        email: user.email,
        nome: user.nome ?? "",
        empresaId: user.empresa_id,
      },
      empresa: empresaSafe,
    })
  } catch (err) {
    next(err)
  }
})

export default router
