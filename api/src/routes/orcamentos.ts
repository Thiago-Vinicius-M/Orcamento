import { Router } from "express"
import { supabase } from "../supabaseClient.js"
import {
  calcularTotaisOrcamento,
  calcularCondicoesPagamento,
  criarDatasOrcamento,
} from "../lib/orcamentoCalculations.js"
import { STATUS_INICIAL, canChangeStatus } from "../lib/orcamentoDomain.js"
import { mapOrcamentoRow } from "../mappers/orcamentoMapper.js"
import { InvalidIdError, parseNumericId } from "../lib/params.js"
import { marcarExpirados } from "../services/orcamentosExpiryService.js"

const router = Router()

router.get("/", async (req, res) => {
  const empresaId = req.user!.empresaId
  await marcarExpirados(empresaId)

  const { data: rows, error } = await supabase
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
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("empresa_id", empresaId)
    .order("numero", { ascending: false })

  if (error) {
    console.error("Erro ao buscar orçamentos no Supabase:", error)
    return res.status(500).json({ error: "Erro ao buscar orçamentos" })
  }

  const orcamentos =
    rows?.map(mapOrcamentoRow) ?? []

  const clienteIds = [...new Set(orcamentos.map((o) => o.clienteId).filter(Boolean))]

  let clienteMap = new Map<number, string>()
  if (clienteIds.length > 0) {
    const { data: clientes, error: clientesError } = await supabase
      .from("clientes")
      .select("id, nome")
      .in("id", clienteIds)

    if (clientesError) {
      console.error("Erro ao buscar clientes no Supabase:", clientesError)
      return res.status(500).json({ error: "Erro ao buscar clientes dos orçamentos" })
    }

    clienteMap = new Map(
      (clientes ?? []).map((c) => [c.id as number, c.nome as string]),
    )
  }

  const result = orcamentos.map((o) => ({
    ...o,
    clienteNome: clienteMap.get(o.clienteId) ?? "Cliente removido",
  }))

  res.json(result)
})

router.get("/:id", async (req, res) => {
  const empresaId = req.user!.empresaId
  let id: number

  try {
    id = parseNumericId(req.params.id, "id")
  } catch (error) {
    if (error instanceof InvalidIdError) {
      return res.status(400).json({ error: error.message })
    }
    throw error
  }

  await marcarExpirados(empresaId)

  const { data: row, error } = await supabase
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
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (error) {
    console.error("Erro ao buscar orçamento no Supabase:", error)
    return res.status(500).json({ error: "Erro ao buscar orçamento" })
  }

  if (!row) return res.status(404).json({ error: "Orçamento não encontrado" })

  const orcamento = mapOrcamentoRow(row)

  const { data: itensRows, error: itensError } = await supabase
    .from("itens_orcamento")
    .select(
      [
        "id",
        "orcamento_id",
        "produto_id",
        "quantidade",
        "preco_unitario",
        "subtotal",
      ].join(", "),
    )
    .eq("orcamento_id", id)

  if (itensError) {
    console.error("Erro ao buscar itens do orçamento no Supabase:", itensError)
    return res.status(500).json({ error: "Erro ao buscar itens do orçamento" })
  }

  const itens =
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
    console.error("Erro ao buscar condições de pagamento no Supabase:", condError)
    return res
      .status(500)
      .json({ error: "Erro ao buscar condições de pagamento do orçamento" })
  }

  const condicoes =
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
    console.error("Erro ao buscar cliente do orçamento no Supabase:", clienteError)
    return res.status(500).json({ error: "Erro ao buscar cliente do orçamento" })
  }

  const produtoIds = [...new Set(itens.map((i) => i.produtoId))]
  const produtosMap: Record<number, unknown> = {}

  if (produtoIds.length > 0) {
    const { data: produtos, error: produtosError } = await supabase
      .from("produtos")
      .select("*")
      .in("id", produtoIds)
      .eq("empresa_id", empresaId)

    if (produtosError) {
      console.error("Erro ao buscar produtos do orçamento no Supabase:", produtosError)
      return res.status(500).json({ error: "Erro ao buscar produtos do orçamento" })
    }

    for (const p of produtos ?? []) {
      produtosMap[p.id as number] = p
    }
  }

  res.json({ orcamento, itens, condicoes, cliente, produtosMap })
})

router.post("/", async (req, res) => {
  const empresaId = req.user!.empresaId
  const {
    clienteId,
    descontoValor,
    descontoPercentual,
    observacoes,
    itens,
    condicoesPagamento,
  } = req.body

  const {
    itensComSubtotal,
    subtotal,
    descontoValor: dv,
    descontoPercentual: dp,
    total,
  } = calcularTotaisOrcamento(itens, descontoPercentual ?? 0, descontoValor ?? 0)

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
    console.error("Erro ao buscar último número de orçamento no Supabase:", lastError)
    return res.status(500).json({ error: "Erro ao criar orçamento" })
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
    console.error("Erro ao criar orçamento no Supabase:", createError)
    return res.status(500).json({ error: "Erro ao criar orçamento" })
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
      console.error("Erro ao criar itens do orçamento no Supabase:", itensError)
      return res.status(500).json({ error: "Erro ao criar itens do orçamento" })
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
      console.error(
        "Erro ao criar condições de pagamento no Supabase:",
        condicoesError,
      )
      return res
        .status(500)
        .json({ error: "Erro ao criar condições de pagamento do orçamento" })
    }
  }

  res.status(201).json({ id: orcamentoId })
})

router.put("/:id", async (req, res) => {
  const empresaId = req.user!.empresaId
  let id: number

  try {
    id = parseNumericId(req.params.id, "id")
  } catch (error) {
    if (error instanceof InvalidIdError) {
      return res.status(400).json({ error: error.message })
    }
    throw error
  }
  const {
    clienteId,
    descontoValor,
    descontoPercentual,
    observacoes,
    itens,
    condicoesPagamento,
  } = req.body

  const { data: existing, error: existingError } = await supabase
    .from("orcamentos")
    .select("id")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (existingError) {
    console.error("Erro ao buscar orçamento no Supabase:", existingError)
    return res.status(500).json({ error: "Erro ao atualizar orçamento" })
  }

  if (!existing) {
    return res.status(404).json({ error: "Orçamento não encontrado" })
  }

  const {
    itensComSubtotal,
    subtotal,
    descontoValor: dv,
    descontoPercentual: dp,
    total,
  } = calcularTotaisOrcamento(itens, descontoPercentual ?? 0, descontoValor ?? 0)

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
    console.error("Erro ao atualizar orçamento no Supabase:", updateError)
    return res.status(500).json({ error: "Erro ao atualizar orçamento" })
  }

  const { error: deleteItensError } = await supabase
    .from("itens_orcamento")
    .delete()
    .eq("orcamento_id", id)

  if (deleteItensError) {
    console.error(
      "Erro ao excluir itens antigos do orçamento no Supabase:",
      deleteItensError,
    )
    return res
      .status(500)
      .json({ error: "Erro ao atualizar itens do orçamento" })
  }

  const { error: deleteCondicoesError } = await supabase
    .from("condicoes_pagamento")
    .delete()
    .eq("orcamento_id", id)

  if (deleteCondicoesError) {
    console.error(
      "Erro ao excluir condições antigas do orçamento no Supabase:",
      deleteCondicoesError,
    )
    return res
      .status(500)
      .json({ error: "Erro ao atualizar condições de pagamento do orçamento" })
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
      console.error("Erro ao criar itens do orçamento no Supabase:", itensError)
      return res.status(500).json({ error: "Erro ao atualizar itens do orçamento" })
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
      console.error(
        "Erro ao criar condições de pagamento no Supabase:",
        condicoesError,
      )
      return res
        .status(500)
        .json({ error: "Erro ao atualizar condições de pagamento do orçamento" })
    }
  }

  res.status(204).end()
})

router.delete("/:id", async (req, res) => {
  const empresaId = req.user!.empresaId
  let id: number

  try {
    id = parseNumericId(req.params.id, "id")
  } catch (error) {
    if (error instanceof InvalidIdError) {
      return res.status(400).json({ error: error.message })
    }
    throw error
  }

  const { data, error } = await supabase
    .from("orcamentos")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select("id")

  if (error) {
    console.error("Erro ao excluir orçamento no Supabase:", error)
    return res.status(500).json({ error: "Erro ao excluir orçamento" })
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: "Orçamento não encontrado" })
  }

  res.status(204).end()
})

router.patch("/:id/status", async (req, res) => {
  const empresaId = req.user!.empresaId
  let id: number

  try {
    id = parseNumericId(req.params.id, "id")
  } catch (error) {
    if (error instanceof InvalidIdError) {
      return res.status(400).json({ error: error.message })
    }
    throw error
  }
  const { status } = req.body as { status?: string }

  if (!status) {
    return res.status(400).json({ error: "Status é obrigatório" })
  }

  const { data: row, error } = await supabase
    .from("orcamentos")
    .select("id, status, empresa_id")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (error) {
    console.error("Erro ao buscar orçamento no Supabase:", error)
    return res.status(500).json({ error: "Erro ao atualizar status do orçamento" })
  }

  if (!row) return res.status(404).json({ error: "Orçamento não encontrado" })

  if (!canChangeStatus(row.status as string, status)) {
    return res.status(400).json({
      error: `Transição de "${row.status}" para "${status}" não é permitida`,
    })
  }

  const { error: updateError } = await supabase
    .from("orcamentos")
    .update({ status })
    .eq("id", id)
    .eq("empresa_id", empresaId)

  if (updateError) {
    console.error("Erro ao atualizar status do orçamento no Supabase:", updateError)
    return res.status(500).json({ error: "Erro ao atualizar status do orçamento" })
  }

  res.status(204).end()
})

router.post("/:id/duplicar", async (req, res) => {
  const empresaId = req.user!.empresaId
  let id: number

  try {
    id = parseNumericId(req.params.id, "id")
  } catch (error) {
    if (error instanceof InvalidIdError) {
      return res.status(400).json({ error: error.message })
    }
    throw error
  }

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
    console.error("Erro ao buscar orçamento original no Supabase:", originalError)
    return res.status(500).json({ error: "Erro ao duplicar orçamento" })
  }

  if (!originalRow) {
    return res.status(404).json({ error: "Orçamento não encontrado" })
  }

  const { data: itensOriginal, error: itensError } = await supabase
    .from("itens_orcamento")
    .select(
      [
        "id",
        "orcamento_id",
        "produto_id",
        "quantidade",
        "preco_unitario",
        "subtotal",
      ].join(", "),
    )
    .eq("orcamento_id", id)

  if (itensError) {
    console.error(
      "Erro ao buscar itens do orçamento original no Supabase:",
      itensError,
    )
    return res.status(500).json({ error: "Erro ao duplicar orçamento" })
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
    console.error(
      "Erro ao buscar condições do orçamento original no Supabase:",
      condicoesError,
    )
    return res.status(500).json({ error: "Erro ao duplicar orçamento" })
  }

  const { data: last, error: lastError } = await supabase
    .from("orcamentos")
    .select("numero")
    .eq("empresa_id", empresaId)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastError) {
    console.error("Erro ao buscar último número de orçamento no Supabase:", lastError)
    return res.status(500).json({ error: "Erro ao duplicar orçamento" })
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
    console.error("Erro ao criar orçamento duplicado no Supabase:", createError)
    return res.status(500).json({ error: "Erro ao duplicar orçamento" })
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
      console.error(
        "Erro ao criar itens do orçamento duplicado no Supabase:",
        itensInsertError,
      )
      return res.status(500).json({ error: "Erro ao duplicar orçamento" })
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
      console.error(
        "Erro ao criar condições de pagamento do orçamento duplicado no Supabase:",
        condicoesInsertError,
      )
      return res.status(500).json({ error: "Erro ao duplicar orçamento" })
    }
  }

  res.status(201).json({ id: novoId })
})

export default router
