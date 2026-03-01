import { Router } from "express"
import { prisma } from "../prisma.js"

const router = Router()

router.get("/", async (req, res) => {
  const search = req.query.search as string | undefined
  const categoria = req.query.categoria as string | undefined

  let results = await prisma.produto.findMany({ orderBy: { nome: "asc" } })

  if (categoria) {
    results = results.filter((p) => p.categoria === categoria)
  }

  if (search?.trim()) {
    const term = search.trim().toLowerCase()
    results = results.filter(
      (p) =>
        p.nome.toLowerCase().includes(term) ||
        p.codigoSku.toLowerCase().includes(term),
    )
  }

  res.json(results)
})

router.get("/categorias", async (_req, res) => {
  const produtos = await prisma.produto.findMany({
    select: { categoria: true },
    distinct: ["categoria"],
    orderBy: { categoria: "asc" },
  })
  res.json(produtos.map((p) => p.categoria))
})

router.get("/:id", async (req, res) => {
  const produto = await prisma.produto.findUnique({
    where: { id: Number(req.params.id) },
  })
  if (!produto) return res.status(404).json({ error: "Produto não encontrado" })
  res.json(produto)
})

router.post("/", async (req, res) => {
  const { nome, descricao, preco, codigoSku, categoria, imagem, ativo } = req.body
  const produto = await prisma.produto.create({
    data: {
      nome,
      descricao: descricao ?? "",
      preco,
      codigoSku,
      categoria,
      imagem: imagem ?? "",
      ativo: ativo ?? true,
    },
  })
  res.status(201).json({ id: produto.id })
})

router.put("/:id", async (req, res) => {
  const { nome, descricao, preco, codigoSku, categoria, imagem, ativo } = req.body
  await prisma.produto.update({
    where: { id: Number(req.params.id) },
    data: {
      nome,
      descricao: descricao ?? "",
      preco,
      codigoSku,
      categoria,
      imagem: imagem ?? "",
      ativo,
    },
  })
  res.status(204).end()
})

router.patch("/:id/toggle-ativo", async (req, res) => {
  const produto = await prisma.produto.findUnique({
    where: { id: Number(req.params.id) },
  })
  if (!produto) return res.status(404).json({ error: "Produto não encontrado" })

  await prisma.produto.update({
    where: { id: produto.id },
    data: { ativo: !produto.ativo },
  })
  res.status(204).end()
})

router.delete("/:id", async (req, res) => {
  await prisma.produto.delete({ where: { id: Number(req.params.id) } })
  res.status(204).end()
})

export default router
