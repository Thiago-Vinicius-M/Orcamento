import type {
  Orcamento,
  ItemOrcamento,
  CondicaoPagamento,
  StatusOrcamento,
  Produto,
  Cliente,
} from "@/types"
import type { OrcamentoFormData } from "@/schemas/orcamento"
import {
  calcularTotaisOrcamento,
  calcularCondicoesPagamento,
  criarDatasOrcamento,
} from "@/lib/orcamentoCalculations"
import { isOrcamentoExpirado, getIdsExpirados, STATUS_INICIAL, canChangeStatus } from "@/lib/orcamentoDomain"
import { clienteService } from "./clienteService"
import { orcamentoRepository, type OrcamentoListItem } from "./orcamentoRepository"

export type { OrcamentoListItem }

export interface OrcamentoCompleto {
  orcamento: Orcamento
  itens: ItemOrcamento[]
  condicoes: CondicaoPagamento[]
}

export interface OrcamentoComDetalhes extends OrcamentoCompleto {
  cliente: Cliente | undefined
  produtosMap: Map<number, Produto>
}

export const orcamentoService = {
  async getProximoNumero(): Promise<number> {
    const ultimo = await orcamentoRepository.findLastByNumero()
    return ultimo ? ultimo.numero + 1 : 1
  },

  async create(data: OrcamentoFormData): Promise<number> {
    const numero = await this.getProximoNumero()
    const now = new Date()
    const { dataEmissao, dataValidade } = criarDatasOrcamento()

    const { itensComSubtotal, subtotal, descontoValor, descontoPercentual, total } =
      calcularTotaisOrcamento(data.itens, data.descontoPercentual, data.descontoValor)

    const condicoesComValores = calcularCondicoesPagamento(
      data.condicoesPagamento,
      total,
    )

    return await orcamentoRepository.transaction(async () => {
      const orcamentoId = await orcamentoRepository.insert({
        numero,
        clienteId: data.clienteId,
        dataEmissao,
        dataValidade,
        subtotal,
        descontoValor,
        descontoPercentual,
        total,
        status: STATUS_INICIAL,
        observacoes: data.observacoes ?? "",
        createdAt: now,
        updatedAt: now,
      })

      const insertableItens = data.itens.map((item, i) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        subtotal: itensComSubtotal[i].subtotal,
      }))

      await orcamentoRepository.insertItensAndCondicoes(
        orcamentoId,
        insertableItens,
        condicoesComValores,
      )

      return orcamentoId
    })
  },

  async getAll(): Promise<OrcamentoListItem[]> {
    const orcamentos = await orcamentoRepository.findAll()
    const expirados = getIdsExpirados(orcamentos)
    if (expirados.length) await orcamentoRepository.marcarExpirados(expirados)
    return orcamentoRepository.enrichWithClienteNome(orcamentos)
  },

  async getById(id: number): Promise<OrcamentoCompleto | undefined> {
    const orcamento = await orcamentoRepository.findById(id)
    if (!orcamento) return undefined

    if (isOrcamentoExpirado(orcamento)) {
      await orcamentoRepository.update(id, {
        status: "expirado" as StatusOrcamento,
        updatedAt: new Date(),
      })
      orcamento.status = "expirado"
    }

    const [itens, condicoes] = await Promise.all([
      orcamentoRepository.findItens(id),
      orcamentoRepository.findCondicoes(id),
    ])

    return { orcamento, itens, condicoes }
  },

  async getByIdWithDetails(id: number): Promise<OrcamentoComDetalhes | undefined> {
    const data = await this.getById(id)
    if (!data) return undefined

    const [cliente, produtosMap] = await Promise.all([
      clienteService.getById(data.orcamento.clienteId),
      orcamentoRepository.buildProdutosMap(data.itens),
    ])

    return { ...data, cliente, produtosMap }
  },

  async update(id: number, data: OrcamentoFormData): Promise<void> {
    const { itensComSubtotal, subtotal, descontoValor, descontoPercentual, total } =
      calcularTotaisOrcamento(data.itens, data.descontoPercentual, data.descontoValor)

    const condicoesComValores = calcularCondicoesPagamento(
      data.condicoesPagamento,
      total,
    )

    await orcamentoRepository.transaction(async () => {
      await orcamentoRepository.update(id, {
        clienteId: data.clienteId,
        subtotal,
        descontoValor,
        descontoPercentual,
        total,
        observacoes: data.observacoes ?? "",
        updatedAt: new Date(),
      })

      await orcamentoRepository.deleteItensAndCondicoes(id)

      const insertableItens = data.itens.map((item, i) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        subtotal: itensComSubtotal[i].subtotal,
      }))

      await orcamentoRepository.insertItensAndCondicoes(
        id,
        insertableItens,
        condicoesComValores,
      )
    })
  },

  async updateStatus(id: number, status: StatusOrcamento): Promise<void> {
    const orcamento = await orcamentoRepository.findById(id)
    if (!orcamento) throw new Error("Orçamento não encontrado")
    if (!canChangeStatus(orcamento, status)) {
      throw new Error(
        `Transição de "${orcamento.status}" para "${status}" não é permitida`,
      )
    }
    await orcamentoRepository.update(id, {
      status,
      updatedAt: new Date(),
    })
  },

  async remove(id: number): Promise<void> {
    await orcamentoRepository.transaction(async () => {
      await orcamentoRepository.deleteItensAndCondicoes(id)
      await orcamentoRepository.deleteById(id)
    })
  },

  async duplicate(id: number): Promise<number> {
    const data = await this.getById(id)
    if (!data) throw new Error("Orçamento não encontrado")

    const numero = await this.getProximoNumero()
    const now = new Date()
    const { dataEmissao, dataValidade } = criarDatasOrcamento()

    return await orcamentoRepository.transaction(async () => {
      const novoId = await orcamentoRepository.insert({
        numero,
        clienteId: data.orcamento.clienteId,
        dataEmissao,
        dataValidade,
        subtotal: data.orcamento.subtotal,
        descontoValor: data.orcamento.descontoValor,
        descontoPercentual: data.orcamento.descontoPercentual,
        total: data.orcamento.total,
        status: STATUS_INICIAL,
        observacoes: data.orcamento.observacoes,
        createdAt: now,
        updatedAt: now,
      })

      const itensParaCopiar = data.itens.map(
        ({ produtoId, quantidade, precoUnitario, subtotal }) => ({
          produtoId,
          quantidade,
          precoUnitario,
          subtotal,
        }),
      )

      const condicoesParaCopiar = data.condicoes.map(
        ({ formaPagamento, parcelas, valorParcela, valorTotal, descontoPercentual, observacoes }) => ({
          formaPagamento,
          parcelas,
          valorParcela,
          valorTotal,
          descontoPercentual,
          observacoes,
        }),
      )

      await orcamentoRepository.insertItensAndCondicoes(
        novoId,
        itensParaCopiar,
        condicoesParaCopiar,
      )

      return novoId
    })
  },
}
