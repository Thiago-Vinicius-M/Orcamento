import { supabase } from "../supabaseClient.js"
import {
  calcularCondicoesPagamento,
  calcularTotaisOrcamento,
  criarDatasOrcamento,
} from "../lib/orcamentoCalculations.js"
import { canChangeStatus, STATUS_INICIAL } from "../lib/orcamentoDomain.js"
import { mapOrcamentoRow, type OrcamentoDto } from "../mappers/orcamentoMapper.js"
import { marcarExpirados } from "./orcamentosExpiryService.js"

type ServiceErrorOpts = {
  statusCode: number
  publicMessage: string
  cause?: unknown
}

export class ServiceError extends Error {
  statusCode: number
  publicMessage: string
  cause?: unknown

  constructor(opts: ServiceErrorOpts) {
    super(opts.publicMessage)
    this.statusCode = opts.statusCode
    this.publicMessage = opts.publicMessage
    this.cause = opts.cause
  }
}

type OrcamentoItemDto = {
  id: unknown
  orcamentoId: unknown
  produtoId: unknown
  quantidade: unknown
  precoUnitario: number
  subtotal: number
}

type CondicaoPagamentoDto = {
  id: unknown
  orcamentoId: unknown
  formaPagamento: unknown
  parcelas: unknown
  valorParcela: number
  valorTotal: number
  descontoPercentual: number
  observacoes: unknown
}

type CreateOrcamentoInput = {
  clienteId: number | null
  descontoValor?: number | null
  descontoPercentual?: number | null
  observacoes?: string | null
  itens: { produtoId: number; quantidade: number; precoUnitario: number }[]
  condicoesPagamento: {
    formaPagamento: string
    parcelas: number
    descontoPercentual?: number
    observacoes?: string
  }[]
}

type UpdateOrcamentoInput = CreateOrcamentoInput

const ORCAMENTO_SELECT = [
  "id",
  "numero",
  "cliente_id",
  "empresa_id",
  "data_emissao",
  "data_validade",
  "subtotal",
  "desconto_valor",
  "desconto_percentual",
  "total",
  "status",
  "observacoes",
  "created_at",
  "updated_at",
].join(", ")

export async function listOrcamentos(
  empresaId: number,
): Promise<(OrcamentoDto & { clienteNome: string })[]> {
  await marcarExpirados(empresaId)

  const { data: rows, error } = await supabase
    .from("orcamentos")
    .select(ORCAMENTO_SELECT)
    .eq("empresa_id", empresaId)
    .order("numero", { ascending: false })

  if (error) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao buscar orçamentos",
      cause: error,
    })
  }

  const orcamentos = rows?.map(mapOrcamentoRow) ?? []

  const clienteIds = [
    ...new Set(orcamentos.map((o) => o.clienteId).filter(Boolean)),
  ] as number[]

  let clienteMap = new Map<number, string>()
  if (clienteIds.length > 0) {
    const { data: clientes, error: clientesError } = await supabase
      .from("clientes")
      .select("id, nome")
      .in("id", clienteIds)

    if (clientesError) {
      throw new ServiceError({
        statusCode: 500,
        publicMessage: "Erro ao buscar clientes dos orçamentos",
        cause: clientesError,
      })
    }

    clienteMap = new Map(
      (clientes ?? []).map((c) => [c.id as number, c.nome as string]),
    )
  }

  return orcamentos.map((o) => ({
    ...o,
    clienteNome: clienteMap.get(o.clienteId ?? -1) ?? "Cliente removido",
  }))
}

export async function getOrcamentoById(empresaId: number, id: number) {
  await marcarExpirados(empresaId)

  const { data: row, error } = await supabase
    .from("orcamentos")
    .select(ORCAMENTO_SELECT)
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (error) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao buscar orçamento",
      cause: error,
    })
  }

  if (!row) {
    throw new ServiceError({
      statusCode: 404,
      publicMessage: "Orçamento não encontrado",
    })
  }

  const orcamento = mapOrcamentoRow(row)

  const { data: itensRows, error: itensError } = await supabase
    .from("itens_orcamento")
    .select(
      ["id", "orcamento_id", "produto_id", "quantidade", "preco_unitario", "subtotal"].join(
        ", ",
      ),
    )
    .eq("orcamento_id", id)

  if (itensError) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao buscar itens do orçamento",
      cause: itensError,
    })
  }

  const itens: OrcamentoItemDto[] =
    itensRows?.map((i) => ({
      id: i.id,
      orcamentoId: i.orcamento_id,
      produtoId: i.produto_id,
      quantidade: i.quantidade,
      precoUnitario: Number(i.preco_unitario),
      subtotal: Number(i.subtotal),
    })) ?? []

  const { data: condRows, error: condError } = await supabase
    .from("condicoes_pagamento")
    .select(
      [
        "id",
        "orcamento_id",
        "forma_pagamento",
        "parcelas",
        "valor_parcela",
        "valor_total",
        "desconto_percentual",
        "observacoes",
      ].join(", "),
    )
    .eq("orcamento_id", id)

  if (condError) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao buscar condições de pagamento do orçamento",
      cause: condError,
    })
  }

  const condicoes: CondicaoPagamentoDto[] =
    condRows?.map((c) => ({
      id: c.id,
      orcamentoId: c.orcamento_id,
      formaPagamento: c.forma_pagamento,
      parcelas: c.parcelas,
      valorParcela: Number(c.valor_parcela),
      valorTotal: Number(c.valor_total),
      descontoPercentual: Number(c.desconto_percentual),
      observacoes: c.observacoes,
    })) ?? []

  const { data: cliente, error: clienteError } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", orcamento.clienteId)
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (clienteError) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao buscar cliente do orçamento",
      cause: clienteError,
    })
  }

  const produtoIds = [...new Set(itens.map((i) => i.produtoId))] as number[]
  const produtosMap: Record<number, unknown> = {}

  if (produtoIds.length > 0) {
    const { data: produtos, error: produtosError } = await supabase
      .from("produtos")
      .select("*")
      .in("id", produtoIds)
      .eq("empresa_id", empresaId)

    if (produtosError) {
      throw new ServiceError({
        statusCode: 500,
        publicMessage: "Erro ao buscar produtos do orçamento",
        cause: produtosError,
      })
    }

    for (const p of produtos ?? []) {
      produtosMap[p.id as number] = p
    }
  }

  return { orcamento, itens, condicoes, cliente, produtosMap }
}

export async function createOrcamento(
  empresaId: number,
  input: CreateOrcamentoInput,
): Promise<{ id: number }> {
  const {
    clienteId,
    descontoValor,
    descontoPercentual,
    observacoes,
    itens,
    condicoesPagamento,
  } = input

  const {
    itensComSubtotal,
    subtotal,
    descontoValor: dv,
    descontoPercentual: dp,
    total,
  } = calcularTotaisOrcamento(
    itens,
    descontoPercentual ?? 0,
    descontoValor ?? 0,
  )

  const condicoesComValores = calcularCondicoesPagamento(condicoesPagamento, total)
  const { dataEmissao, dataValidade } = criarDatasOrcamento()

  const { data: last, error: lastError } = await supabase
    .from("orcamentos")
    .select("numero")
    .eq("empresa_id", empresaId)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastError) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao criar orçamento",
      cause: lastError,
    })
  }

  const numero = last ? (last.numero as number) + 1 : 1

  const { data: created, error: createError } = await supabase
    .from("orcamentos")
    .insert({
      numero,
      cliente_id: clienteId,
      empresa_id: empresaId,
      data_emissao: dataEmissao.toISOString(),
      data_validade: dataValidade.toISOString(),
      subtotal,
      desconto_valor: dv,
      desconto_percentual: dp,
      total,
      status: STATUS_INICIAL,
      observacoes: observacoes ?? "",
    })
    .select("id")
    .maybeSingle()

  if (createError || !created) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao criar orçamento",
      cause: createError,
    })
  }

  const orcamentoId = created.id as number

  const itensPayload =
    itens?.map(
      (
        item: { produtoId: number; quantidade: number; precoUnitario: number },
        i: number,
      ) => ({
        orcamento_id: orcamentoId,
        produto_id: item.produtoId,
        quantidade: item.quantidade,
        preco_unitario: item.precoUnitario,
        subtotal: itensComSubtotal[i].subtotal,
      }),
    ) ?? []

  if (itensPayload.length > 0) {
    const { error: itensError } = await supabase
      .from("itens_orcamento")
      .insert(itensPayload)

    if (itensError) {
      throw new ServiceError({
        statusCode: 500,
        publicMessage: "Erro ao criar itens do orçamento",
        cause: itensError,
      })
    }
  }

  const condicoesPayload =
    condicoesComValores?.map((cond) => ({
      orcamento_id: orcamentoId,
      forma_pagamento: cond.formaPagamento,
      parcelas: cond.parcelas,
      valor_parcela: cond.valorParcela,
      valor_total: cond.valorTotal,
      desconto_percentual: cond.descontoPercentual,
      observacoes: cond.observacoes,
    })) ?? []

  if (condicoesPayload.length > 0) {
    const { error: condicoesError } = await supabase
      .from("condicoes_pagamento")
      .insert(condicoesPayload)

    if (condicoesError) {
      throw new ServiceError({
        statusCode: 500,
        publicMessage: "Erro ao criar condições de pagamento do orçamento",
        cause: condicoesError,
      })
    }
  }

  return { id: orcamentoId }
}

export async function updateOrcamento(
  empresaId: number,
  id: number,
  input: UpdateOrcamentoInput,
): Promise<void> {
  const {
    clienteId,
    descontoValor,
    descontoPercentual,
    observacoes,
    itens,
    condicoesPagamento,
  } = input

  const { data: existing, error: existingError } = await supabase
    .from("orcamentos")
    .select("id")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (existingError) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao atualizar orçamento",
      cause: existingError,
    })
  }

  if (!existing) {
    throw new ServiceError({
      statusCode: 404,
      publicMessage: "Orçamento não encontrado",
    })
  }

  const {
    itensComSubtotal,
    subtotal,
    descontoValor: dv,
    descontoPercentual: dp,
    total,
  } = calcularTotaisOrcamento(
    itens,
    descontoPercentual ?? 0,
    descontoValor ?? 0,
  )

  const condicoesComValores = calcularCondicoesPagamento(condicoesPagamento, total)

  const { error: updateError } = await supabase
    .from("orcamentos")
    .update({
      cliente_id: clienteId,
      subtotal,
      desconto_valor: dv,
      desconto_percentual: dp,
      total,
      observacoes: observacoes ?? "",
    })
    .eq("id", id)
    .eq("empresa_id", empresaId)

  if (updateError) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao atualizar orçamento",
      cause: updateError,
    })
  }

  const { error: deleteItensError } = await supabase
    .from("itens_orcamento")
    .delete()
    .eq("orcamento_id", id)

  if (deleteItensError) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao atualizar itens do orçamento",
      cause: deleteItensError,
    })
  }

  const { error: deleteCondicoesError } = await supabase
    .from("condicoes_pagamento")
    .delete()
    .eq("orcamento_id", id)

  if (deleteCondicoesError) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao atualizar condições de pagamento do orçamento",
      cause: deleteCondicoesError,
    })
  }

  const itensPayload =
    itens?.map(
      (
        item: { produtoId: number; quantidade: number; precoUnitario: number },
        i: number,
      ) => ({
        orcamento_id: id,
        produto_id: item.produtoId,
        quantidade: item.quantidade,
        preco_unitario: item.precoUnitario,
        subtotal: itensComSubtotal[i].subtotal,
      }),
    ) ?? []

  if (itensPayload.length > 0) {
    const { error: itensError } = await supabase
      .from("itens_orcamento")
      .insert(itensPayload)

    if (itensError) {
      throw new ServiceError({
        statusCode: 500,
        publicMessage: "Erro ao atualizar itens do orçamento",
        cause: itensError,
      })
    }
  }

  const condicoesPayload =
    condicoesComValores?.map((cond) => ({
      orcamento_id: id,
      forma_pagamento: cond.formaPagamento,
      parcelas: cond.parcelas,
      valor_parcela: cond.valorParcela,
      valor_total: cond.valorTotal,
      desconto_percentual: cond.descontoPercentual,
      observacoes: cond.observacoes,
    })) ?? []

  if (condicoesPayload.length > 0) {
    const { error: condicoesError } = await supabase
      .from("condicoes_pagamento")
      .insert(condicoesPayload)

    if (condicoesError) {
      throw new ServiceError({
        statusCode: 500,
        publicMessage: "Erro ao atualizar condições de pagamento do orçamento",
        cause: condicoesError,
      })
    }
  }
}

export async function deleteOrcamento(
  empresaId: number,
  id: number,
): Promise<void> {
  const { data, error } = await supabase
    .from("orcamentos")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select("id")

  if (error) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao excluir orçamento",
      cause: error,
    })
  }

  if (!data || data.length === 0) {
    throw new ServiceError({
      statusCode: 404,
      publicMessage: "Orçamento não encontrado",
    })
  }
}

export async function changeOrcamentoStatus(
  empresaId: number,
  id: number,
  status: string,
): Promise<void> {
  const { data: row, error } = await supabase
    .from("orcamentos")
    .select("id, status, empresa_id")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (error) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao atualizar status do orçamento",
      cause: error,
    })
  }

  if (!row) {
    throw new ServiceError({
      statusCode: 404,
      publicMessage: "Orçamento não encontrado",
    })
  }

  if (!canChangeStatus(row.status as string, status)) {
    throw new ServiceError({
      statusCode: 400,
      publicMessage: `Transição de "${row.status}" para "${status}" não é permitida`,
    })
  }

  const { error: updateError } = await supabase
    .from("orcamentos")
    .update({ status })
    .eq("id", id)
    .eq("empresa_id", empresaId)

  if (updateError) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao atualizar status do orçamento",
      cause: updateError,
    })
  }
}

export async function duplicateOrcamento(
  empresaId: number,
  id: number,
): Promise<{ id: number }> {
  const { data: originalRow, error: originalError } = await supabase
    .from("orcamentos")
    .select(
      [
        "id",
        "numero",
        "cliente_id",
        "empresa_id",
        "data_emissao",
        "data_validade",
        "subtotal",
        "desconto_valor",
        "desconto_percentual",
        "total",
        "status",
        "observacoes",
      ].join(", "),
    )
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (originalError) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao duplicar orçamento",
      cause: originalError,
    })
  }

  if (!originalRow) {
    throw new ServiceError({
      statusCode: 404,
      publicMessage: "Orçamento não encontrado",
    })
  }

  const { data: itensOriginal, error: itensError } = await supabase
    .from("itens_orcamento")
    .select(
      ["id", "orcamento_id", "produto_id", "quantidade", "preco_unitario", "subtotal"].join(
        ", ",
      ),
    )
    .eq("orcamento_id", id)

  if (itensError) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao duplicar orçamento",
      cause: itensError,
    })
  }

  const { data: condicoesOriginais, error: condicoesError } = await supabase
    .from("condicoes_pagamento")
    .select(
      [
        "id",
        "orcamento_id",
        "forma_pagamento",
        "parcelas",
        "valor_parcela",
        "valor_total",
        "desconto_percentual",
        "observacoes",
      ].join(", "),
    )
    .eq("orcamento_id", id)

  if (condicoesError) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao duplicar orçamento",
      cause: condicoesError,
    })
  }

  const { data: last, error: lastError } = await supabase
    .from("orcamentos")
    .select("numero")
    .eq("empresa_id", empresaId)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastError) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao duplicar orçamento",
      cause: lastError,
    })
  }

  const numero = last ? (last.numero as number) + 1 : 1
  const { dataEmissao, dataValidade } = criarDatasOrcamento()

  const { data: novo, error: createError } = await supabase
    .from("orcamentos")
    .insert({
      numero,
      cliente_id: originalRow.cliente_id,
      empresa_id: empresaId,
      data_emissao: dataEmissao.toISOString(),
      data_validade: dataValidade.toISOString(),
      subtotal: Number(originalRow.subtotal),
      desconto_valor: Number(originalRow.desconto_valor),
      desconto_percentual: Number(originalRow.desconto_percentual),
      total: Number(originalRow.total),
      status: STATUS_INICIAL,
      observacoes: originalRow.observacoes,
    })
    .select("id")
    .maybeSingle()

  if (createError || !novo) {
    throw new ServiceError({
      statusCode: 500,
      publicMessage: "Erro ao duplicar orçamento",
      cause: createError,
    })
  }

  const novoId = novo.id as number

  const itensPayload =
    itensOriginal?.map((item) => ({
      orcamento_id: novoId,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      subtotal: item.subtotal,
    })) ?? []

  if (itensPayload.length > 0) {
    const { error: itensInsertError } = await supabase
      .from("itens_orcamento")
      .insert(itensPayload)

    if (itensInsertError) {
      throw new ServiceError({
        statusCode: 500,
        publicMessage: "Erro ao duplicar orçamento",
        cause: itensInsertError,
      })
    }
  }

  const condicoesPayload =
    condicoesOriginais?.map((cond) => ({
      orcamento_id: novoId,
      forma_pagamento: cond.forma_pagamento,
      parcelas: cond.parcelas,
      valor_parcela: cond.valor_parcela,
      valor_total: cond.valor_total,
      desconto_percentual: cond.desconto_percentual,
      observacoes: cond.observacoes,
    })) ?? []

  if (condicoesPayload.length > 0) {
    const { error: condicoesInsertError } = await supabase
      .from("condicoes_pagamento")
      .insert(condicoesPayload)

    if (condicoesInsertError) {
      throw new ServiceError({
        statusCode: 500,
        publicMessage: "Erro ao duplicar orçamento",
        cause: condicoesInsertError,
      })
    }
  }

  return { id: novoId }
}

