import { Router } from "express"
import { prisma } from "../prisma.js"
import { isOrcamentoExpirado } from "../lib/orcamentoDomain.js"

const router = Router()

router.get("/stats", async (_req, res) => {
  const vigentes = await prisma.orcamento.findMany({
    where: { status: "vigente" },
  })
  const idsExpirados = vigentes
    .filter(isOrcamentoExpirado)
    .map((o) => o.id)

  if (idsExpirados.length > 0) {
    await prisma.orcamento.updateMany({
      where: { id: { in: idsExpirados } },
      data: { status: "expirado" },
    })
  }

  const all = await prisma.orcamento.findMany({
    orderBy: { numero: "desc" },
  })

  const stats = {
    total: all.length,
    vigente: 0,
    expirado: 0,
    aprovado: 0,
    cancelado: 0,
    valorVigentes: 0,
    valorAprovados: 0,
    valorTotal: 0,
  }

  for (const orc of all) {
    const s = orc.status as keyof typeof stats
    if (typeof stats[s] === "number") (stats[s] as number)++
    stats.valorTotal += orc.total
    if (orc.status === "vigente") stats.valorVigentes += orc.total
    if (orc.status === "aprovado") stats.valorAprovados += orc.total
  }

  const recentes = all.slice(0, 5)
  const clienteIds = [...new Set(recentes.map((o) => o.clienteId))]
  const clientes = await prisma.cliente.findMany({
    where: { id: { in: clienteIds } },
    select: { id: true, nome: true },
  })
  const clienteMap = new Map(clientes.map((c) => [c.id, c.nome]))

  const recentesComNome = recentes.map((o) => ({
    ...o,
    clienteNome: clienteMap.get(o.clienteId) ?? "Cliente removido",
  }))

  const clienteCount = await prisma.cliente.count()
  const produtoCount = await prisma.produto.count()

  res.json({
    ...stats,
    recentes: recentesComNome,
    clienteCount,
    produtoCount,
  })
})

export default router
