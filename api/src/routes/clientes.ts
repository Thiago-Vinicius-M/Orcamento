import { Router } from "express"
import { prisma } from "../prisma.js"

const router = Router()

router.get("/", async (req, res) => {
  const search = req.query.search as string | undefined

  if (search?.trim()) {
    const term = search.trim().toLowerCase()
    const digits = term.replace(/\D/g, "")

    const all = await prisma.cliente.findMany({ orderBy: { nome: "asc" } })
    const filtered = all.filter((c) => {
      if (c.nome.toLowerCase().includes(term)) return true
      if (digits && c.cpfCnpj.replace(/\D/g, "").includes(digits)) return true
      return false
    })
    return res.json(filtered)
  }

  const clientes = await prisma.cliente.findMany({ orderBy: { nome: "asc" } })
  res.json(clientes)
})

router.get("/count", async (_req, res) => {
  const count = await prisma.cliente.count()
  res.json({ count })
})

router.get("/:id", async (req, res) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id: Number(req.params.id) },
  })
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" })
  res.json(cliente)
})

router.post("/", async (req, res) => {
  const {
    nome, cpfCnpj, telefone, email,
    logradouro, numero, complemento, bairro, cidade, estado, cep,
  } = req.body

  const cliente = await prisma.cliente.create({
    data: {
      nome, cpfCnpj, telefone,
      email: email ?? "",
      logradouro: logradouro ?? "",
      numero: numero ?? "",
      complemento: complemento ?? "",
      bairro: bairro ?? "",
      cidade: cidade ?? "",
      estado: estado ?? "",
      cep: cep ?? "",
    },
  })
  res.status(201).json({ id: cliente.id })
})

router.put("/:id", async (req, res) => {
  const {
    nome, cpfCnpj, telefone, email,
    logradouro, numero, complemento, bairro, cidade, estado, cep,
  } = req.body

  await prisma.cliente.update({
    where: { id: Number(req.params.id) },
    data: {
      nome, cpfCnpj, telefone,
      email: email ?? "",
      logradouro: logradouro ?? "",
      numero: numero ?? "",
      complemento: complemento ?? "",
      bairro: bairro ?? "",
      cidade: cidade ?? "",
      estado: estado ?? "",
      cep: cep ?? "",
    },
  })
  res.status(204).end()
})

router.delete("/:id", async (req, res) => {
  await prisma.cliente.delete({ where: { id: Number(req.params.id) } })
  res.status(204).end()
})

export default router
