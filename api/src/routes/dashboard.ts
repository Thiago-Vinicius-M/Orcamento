import { Router } from "express"
import { supabase } from "../supabaseClient.js"
import { marcarExpirados } from "../services/orcamentosExpiryService.js"
import { mapOrcamentoRow } from "../mappers/orcamentoMapper.js"

const router = Router()

router.get("/stats", async (req, res) => {
  const empresaId = req.user!.empresaId

  await marcarExpirados(empresaId)

  const { data: allRows, error: allError } = await supabase
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

  if (allError) {
    console.error("Erro ao buscar orçamentos no Supabase:", allError)
    return res
      .status(500)
      .json({ error: "Erro ao calcular estatísticas de orçamentos" })
  }

  const all = allRows?.map(mapOrcamentoRow) ?? []

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
  const clienteIds = [...new Set(recentes.map((o) => o.clienteId).filter(Boolean))]

  let clienteMap = new Map<number, string>()
  if (clienteIds.length > 0) {
    const { data: clientes, error: clientesError } = await supabase
      .from("clientes")
      .select("id, nome")
      .in("id", clienteIds)
      .eq("empresa_id", empresaId)

    if (clientesError) {
      console.error("Erro ao buscar clientes no Supabase:", clientesError)
      return res
        .status(500)
        .json({ error: "Erro ao calcular estatísticas de orçamentos" })
    }

    clienteMap = new Map(
      (clientes ?? []).map((c) => [c.id as number, c.nome as string]),
    )
  }

  const recentesComNome = recentes.map((o) => ({
    ...o,
    clienteNome: clienteMap.get(o.clienteId) ?? "Cliente removido",
  }))

  const { count: clienteCount, error: clienteCountError } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", empresaId)

  if (clienteCountError) {
    console.error(
      "Erro ao buscar contagem de clientes no Supabase:",
      clienteCountError,
    )
    return res
      .status(500)
      .json({ error: "Erro ao calcular estatísticas de orçamentos" })
  }

  const { count: produtoCount, error: produtoCountError } = await supabase
    .from("produtos")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", empresaId)

  if (produtoCountError) {
    console.error(
      "Erro ao buscar contagem de produtos no Supabase:",
      produtoCountError,
    )
    return res
      .status(500)
      .json({ error: "Erro ao calcular estatísticas de orçamentos" })
  }

  res.json({
    ...stats,
    recentes: recentesComNome,
    clienteCount: clienteCount ?? 0,
    produtoCount: produtoCount ?? 0,
  })
})

export default router
