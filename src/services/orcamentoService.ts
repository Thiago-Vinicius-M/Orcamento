import { db } from "@/db"
import type {
  Orcamento,
  ItemOrcamento,
  CondicaoPagamento,
  StatusOrcamento,
} from "@/types"
import type { OrcamentoFormData } from "@/schemas/orcamento"

export interface OrcamentoCompleto {
  orcamento: Orcamento
  itens: ItemOrcamento[]
  condicoes: CondicaoPagamento[]
}

export interface OrcamentoListItem extends Orcamento {
  clienteNome: string
}

export const orcamentoService = {
  async getProximoNumero(): Promise<number> {
    const ultimo = await db.orcamentos.orderBy("numero").last()
    return ultimo ? ultimo.numero + 1 : 1
  },

  async verificarExpiracoes(): Promise<void> {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const vigentes = await db.orcamentos
      .where("status")
      .equals("vigente" satisfies StatusOrcamento)
      .toArray()

    const expirados = vigentes.filter(
      (o) => new Date(o.dataValidade) < hoje,
    )

    await Promise.all(
      expirados.map((o) =>
        db.orcamentos.update(o.id!, {
          status: "expirado" satisfies StatusOrcamento,
          updatedAt: new Date(),
        }),
      ),
    )
  },

  async create(data: OrcamentoFormData): Promise<number> {
    const numero = await this.getProximoNumero()
    const now = new Date()
    const dataEmissao = new Date()
    dataEmissao.setHours(0, 0, 0, 0)
    const dataValidade = new Date(dataEmissao)
    dataValidade.setDate(dataValidade.getDate() + 30)

    const itensComSubtotal = data.itens.map((item) => ({
      ...item,
      subtotal: item.quantidade * item.precoUnitario,
    }))

    const subtotal = itensComSubtotal.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    )

    let descontoValor = data.descontoValor
    const descontoPercentual = data.descontoPercentual
    if (descontoPercentual > 0) {
      descontoValor = subtotal * (descontoPercentual / 100)
    }
    const total = Math.max(0, subtotal - descontoValor)

    const condicoesComValores = data.condicoesPagamento.map((cond) => {
      const condDesconto = cond.descontoPercentual || 0
      const condTotal = Number((total * (1 - condDesconto / 100)).toFixed(2))
      const parcelas = cond.parcelas || 1
      const condParcela = Number((condTotal / parcelas).toFixed(2))
      return {
        formaPagamento: cond.formaPagamento,
        parcelas: cond.parcelas,
        valorTotal: condTotal,
        valorParcela: condParcela,
        descontoPercentual: condDesconto,
        observacoes: cond.observacoes ?? "",
      }
    })

    return await db.transaction(
      "rw",
      [db.orcamentos, db.itensOrcamento, db.condicoesPagamento],
      async () => {
        const orcamentoId = (await db.orcamentos.add({
          numero,
          clienteId: data.clienteId,
          dataEmissao,
          dataValidade,
          subtotal,
          descontoValor,
          descontoPercentual,
          total,
          status: "vigente",
          observacoes: data.observacoes ?? "",
          createdAt: now,
          updatedAt: now,
        } as Orcamento)) as number

        await Promise.all(
          itensComSubtotal.map((item) =>
            db.itensOrcamento.add({
              orcamentoId,
              produtoId: item.produtoId,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              subtotal: item.subtotal,
            } as ItemOrcamento),
          ),
        )

        await Promise.all(
          condicoesComValores.map((cond) =>
            db.condicoesPagamento.add({
              orcamentoId,
              ...cond,
            } as CondicaoPagamento),
          ),
        )

        return orcamentoId
      },
    )
  },

  async getAll(): Promise<OrcamentoListItem[]> {
    await this.verificarExpiracoes()
    const orcamentos = await db.orcamentos
      .orderBy("numero")
      .reverse()
      .toArray()

    const result: OrcamentoListItem[] = []
    for (const orc of orcamentos) {
      const cliente = await db.clientes.get(orc.clienteId)
      result.push({
        ...orc,
        clienteNome: cliente?.nome ?? "Cliente removido",
      })
    }
    return result
  },

  async getById(id: number): Promise<OrcamentoCompleto | undefined> {
    const orcamento = await db.orcamentos.get(id)
    if (!orcamento) return undefined

    if (orcamento.status === "vigente") {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      if (new Date(orcamento.dataValidade) < hoje) {
        await db.orcamentos.update(id, {
          status: "expirado" as StatusOrcamento,
          updatedAt: new Date(),
        })
        orcamento.status = "expirado"
      }
    }

    const itens = await db.itensOrcamento
      .where("orcamentoId")
      .equals(id)
      .toArray()

    const condicoes = await db.condicoesPagamento
      .where("orcamentoId")
      .equals(id)
      .toArray()

    return { orcamento, itens, condicoes }
  },

  async update(id: number, data: OrcamentoFormData): Promise<void> {
    const itensComSubtotal = data.itens.map((item) => ({
      ...item,
      subtotal: item.quantidade * item.precoUnitario,
    }))

    const subtotal = itensComSubtotal.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    )

    let descontoValor = data.descontoValor
    const descontoPercentual = data.descontoPercentual
    if (descontoPercentual > 0) {
      descontoValor = subtotal * (descontoPercentual / 100)
    }
    const total = Math.max(0, subtotal - descontoValor)

    const condicoesComValores = data.condicoesPagamento.map((cond) => {
      const condDesconto = cond.descontoPercentual || 0
      const condTotal = Number((total * (1 - condDesconto / 100)).toFixed(2))
      const parcelas = cond.parcelas || 1
      const condParcela = Number((condTotal / parcelas).toFixed(2))
      return {
        formaPagamento: cond.formaPagamento,
        parcelas: cond.parcelas,
        valorTotal: condTotal,
        valorParcela: condParcela,
        descontoPercentual: condDesconto,
        observacoes: cond.observacoes ?? "",
      }
    })

    await db.transaction(
      "rw",
      [db.orcamentos, db.itensOrcamento, db.condicoesPagamento],
      async () => {
        await db.orcamentos.update(id, {
          clienteId: data.clienteId,
          subtotal,
          descontoValor,
          descontoPercentual,
          total,
          observacoes: data.observacoes ?? "",
          updatedAt: new Date(),
        })

        await db.itensOrcamento.where("orcamentoId").equals(id).delete()
        await Promise.all(
          itensComSubtotal.map((item) =>
            db.itensOrcamento.add({
              orcamentoId: id,
              produtoId: item.produtoId,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              subtotal: item.subtotal,
            } as ItemOrcamento),
          ),
        )

        await db.condicoesPagamento
          .where("orcamentoId")
          .equals(id)
          .delete()
        await Promise.all(
          condicoesComValores.map((cond) =>
            db.condicoesPagamento.add({
              orcamentoId: id,
              ...cond,
            } as CondicaoPagamento),
          ),
        )
      },
    )
  },

  async updateStatus(id: number, status: StatusOrcamento): Promise<void> {
    await db.orcamentos.update(id, {
      status,
      updatedAt: new Date(),
    })
  },

  async remove(id: number): Promise<void> {
    await db.transaction(
      "rw",
      [db.orcamentos, db.itensOrcamento, db.condicoesPagamento],
      async () => {
        await db.itensOrcamento.where("orcamentoId").equals(id).delete()
        await db.condicoesPagamento
          .where("orcamentoId")
          .equals(id)
          .delete()
        await db.orcamentos.delete(id)
      },
    )
  },

  async duplicate(id: number): Promise<number> {
    const data = await this.getById(id)
    if (!data) throw new Error("Orçamento não encontrado")

    const numero = await this.getProximoNumero()
    const now = new Date()
    const dataEmissao = new Date()
    dataEmissao.setHours(0, 0, 0, 0)
    const dataValidade = new Date(dataEmissao)
    dataValidade.setDate(dataValidade.getDate() + 30)

    return await db.transaction(
      "rw",
      [db.orcamentos, db.itensOrcamento, db.condicoesPagamento],
      async () => {
        const novoId = (await db.orcamentos.add({
          numero,
          clienteId: data.orcamento.clienteId,
          dataEmissao,
          dataValidade,
          subtotal: data.orcamento.subtotal,
          descontoValor: data.orcamento.descontoValor,
          descontoPercentual: data.orcamento.descontoPercentual,
          total: data.orcamento.total,
          status: "vigente" as StatusOrcamento,
          observacoes: data.orcamento.observacoes,
          createdAt: now,
          updatedAt: now,
        } as Orcamento)) as number

        await Promise.all(
          data.itens.map((item) =>
            db.itensOrcamento.add({
              orcamentoId: novoId,
              produtoId: item.produtoId,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              subtotal: item.subtotal,
            } as ItemOrcamento),
          ),
        )

        await Promise.all(
          data.condicoes.map((cond) =>
            db.condicoesPagamento.add({
              orcamentoId: novoId,
              formaPagamento: cond.formaPagamento,
              parcelas: cond.parcelas,
              valorParcela: cond.valorParcela,
              valorTotal: cond.valorTotal,
              descontoPercentual: cond.descontoPercentual,
              observacoes: cond.observacoes,
            } as CondicaoPagamento),
          ),
        )

        return novoId
      },
    )
  },

  async count(): Promise<number> {
    return db.orcamentos.count()
  },

  async countByStatus(status: StatusOrcamento): Promise<number> {
    return db.orcamentos.where("status").equals(status).count()
  },

  async getDashboardStats(): Promise<{
    total: number
    vigente: number
    expirado: number
    aprovado: number
    cancelado: number
    valorVigentes: number
    valorAprovados: number
    valorTotal: number
    recentes: OrcamentoListItem[]
  }> {
    await this.verificarExpiracoes()

    const all = await db.orcamentos.orderBy("numero").reverse().toArray()

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
      stats[orc.status]++
      stats.valorTotal += orc.total
      if (orc.status === "vigente") stats.valorVigentes += orc.total
      if (orc.status === "aprovado") stats.valorAprovados += orc.total
    }

    const recentesRaw = all.slice(0, 5)
    const recentes: OrcamentoListItem[] = []
    for (const orc of recentesRaw) {
      const cliente = await db.clientes.get(orc.clienteId)
      recentes.push({
        ...orc,
        clienteNome: cliente?.nome ?? "Cliente removido",
      })
    }

    return { ...stats, recentes }
  },
}
