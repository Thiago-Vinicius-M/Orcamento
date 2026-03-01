import { Router } from "express"
import { prisma } from "../prisma.js"
import {
  calcularTotaisOrcamento,
  calcularCondicoesPagamento,
  criarDatasOrcamento,
} from "../lib/orcamentoCalculations.js"
import {
  STATUS_INICIAL,
  isOrcamentoExpirado,
  canChangeStatus,
} from "../lib/orcamentoDomain.js"

const router = Router()

async function marcarExpirados() {
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
}

router.get("/", async (_req, res) => {
  await marcarExpirados()

  const orcamentos = await prisma.orcamento.findMany({
    orderBy: { numero: "desc" },
    include: { cliente: { select: { nome: true } } },
  })

  const result = orcamentos.map((o) => {
    const { cliente, ...rest } = o
    return { ...rest, clienteNome: cliente?.nome ?? "Cliente removido" }
  })

  res.json(result)
})

router.get("/:id", async (req, res) => {
  await marcarExpirados()

  const record = await prisma.orcamento.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      itens: true,
      condicoes: true,
      cliente: true,
    },
  })

  if (!record) return res.status(404).json({ error: "Orçamento não encontrado" })

  const { itens, condicoes, cliente, ...orcamento } = record

  const produtoIds = [...new Set(itens.map((i) => i.produtoId))]
  const produtos = await prisma.produto.findMany({
    where: { id: { in: produtoIds } },
  })

  const produtosMap: Record<number, typeof produtos[0]> = {}
  for (const p of produtos) {
    produtosMap[p.id] = p
  }

  res.json({ orcamento, itens, condicoes, cliente, produtosMap })
})

router.post("/", async (req, res) => {
  const { clienteId, descontoValor, descontoPercentual, observacoes, itens, condicoesPagamento } = req.body

  const { itensComSubtotal, subtotal, descontoValor: dv, descontoPercentual: dp, total } =
    calcularTotaisOrcamento(itens, descontoPercentual ?? 0, descontoValor ?? 0)

  const condicoesComValores = calcularCondicoesPagamento(condicoesPagamento, total)
  const { dataEmissao, dataValidade } = criarDatasOrcamento()

  const last = await prisma.orcamento.findFirst({ orderBy: { numero: "desc" } })
  const numero = last ? last.numero + 1 : 1

  const orcamento = await prisma.$transaction(async (tx) => {
    return tx.orcamento.create({
      data: {
        numero,
        clienteId,
        dataEmissao,
        dataValidade,
        subtotal,
        descontoValor: dv,
        descontoPercentual: dp,
        total,
        status: STATUS_INICIAL,
        observacoes: observacoes ?? "",
        itens: {
          create: itens.map((item: { produtoId: number; quantidade: number; precoUnitario: number }, i: number) => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            subtotal: itensComSubtotal[i].subtotal,
          })),
        },
        condicoes: {
          create: condicoesComValores.map((cond) => ({
            formaPagamento: cond.formaPagamento,
            parcelas: cond.parcelas,
            valorParcela: cond.valorParcela,
            valorTotal: cond.valorTotal,
            descontoPercentual: cond.descontoPercentual,
            observacoes: cond.observacoes,
          })),
        },
      },
    })
  })

  res.status(201).json({ id: orcamento.id })
})

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id)
  const { clienteId, descontoValor, descontoPercentual, observacoes, itens, condicoesPagamento } = req.body

  const { itensComSubtotal, subtotal, descontoValor: dv, descontoPercentual: dp, total } =
    calcularTotaisOrcamento(itens, descontoPercentual ?? 0, descontoValor ?? 0)

  const condicoesComValores = calcularCondicoesPagamento(condicoesPagamento, total)

  await prisma.$transaction(async (tx) => {
    await tx.orcamento.update({
      where: { id },
      data: {
        clienteId,
        subtotal,
        descontoValor: dv,
        descontoPercentual: dp,
        total,
        observacoes: observacoes ?? "",
      },
    })

    await tx.itemOrcamento.deleteMany({ where: { orcamentoId: id } })
    await tx.condicaoPagamento.deleteMany({ where: { orcamentoId: id } })

    await tx.itemOrcamento.createMany({
      data: itens.map((item: { produtoId: number; quantidade: number; precoUnitario: number }, i: number) => ({
        orcamentoId: id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        subtotal: itensComSubtotal[i].subtotal,
      })),
    })

    await tx.condicaoPagamento.createMany({
      data: condicoesComValores.map((cond) => ({
        orcamentoId: id,
        formaPagamento: cond.formaPagamento,
        parcelas: cond.parcelas,
        valorParcela: cond.valorParcela,
        valorTotal: cond.valorTotal,
        descontoPercentual: cond.descontoPercentual,
        observacoes: cond.observacoes,
      })),
    })
  })

  res.status(204).end()
})

router.delete("/:id", async (req, res) => {
  await prisma.orcamento.delete({ where: { id: Number(req.params.id) } })
  res.status(204).end()
})

router.patch("/:id/status", async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body

  const orcamento = await prisma.orcamento.findUnique({ where: { id } })
  if (!orcamento) return res.status(404).json({ error: "Orçamento não encontrado" })

  if (!canChangeStatus(orcamento.status, status)) {
    return res.status(400).json({
      error: `Transição de "${orcamento.status}" para "${status}" não é permitida`,
    })
  }

  await prisma.orcamento.update({ where: { id }, data: { status } })
  res.status(204).end()
})

router.post("/:id/duplicar", async (req, res) => {
  const id = Number(req.params.id)

  const original = await prisma.orcamento.findUnique({
    where: { id },
    include: { itens: true, condicoes: true },
  })

  if (!original) return res.status(404).json({ error: "Orçamento não encontrado" })

  const last = await prisma.orcamento.findFirst({ orderBy: { numero: "desc" } })
  const numero = last ? last.numero + 1 : 1
  const { dataEmissao, dataValidade } = criarDatasOrcamento()

  const novo = await prisma.$transaction(async (tx) => {
    return tx.orcamento.create({
      data: {
        numero,
        clienteId: original.clienteId,
        dataEmissao,
        dataValidade,
        subtotal: original.subtotal,
        descontoValor: original.descontoValor,
        descontoPercentual: original.descontoPercentual,
        total: original.total,
        status: STATUS_INICIAL,
        observacoes: original.observacoes,
        itens: {
          create: original.itens.map((item) => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            subtotal: item.subtotal,
          })),
        },
        condicoes: {
          create: original.condicoes.map((cond) => ({
            formaPagamento: cond.formaPagamento,
            parcelas: cond.parcelas,
            valorParcela: cond.valorParcela,
            valorTotal: cond.valorTotal,
            descontoPercentual: cond.descontoPercentual,
            observacoes: cond.observacoes,
          })),
        },
      },
    })
  })

  res.status(201).json({ id: novo.id })
})

export default router
