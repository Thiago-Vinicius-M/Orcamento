import { Router } from "express"
import { prisma } from "../prisma.js"

const router = Router()

router.get("/", async (_req, res) => {
  const loja = await prisma.loja.findFirst()
  res.json(loja ?? null)
})

router.put("/", async (req, res) => {
  const { nome, cnpj, endereco, telefone, email, logo } = req.body
  const existing = await prisma.loja.findFirst()

  if (existing) {
    const updated = await prisma.loja.update({
      where: { id: existing.id },
      data: { nome, cnpj, endereco, telefone, email, logo },
    })
    res.json(updated)
  } else {
    const created = await prisma.loja.create({
      data: { nome, cnpj, endereco, telefone, email, logo },
    })
    res.status(201).json(created)
  }
})

export default router
