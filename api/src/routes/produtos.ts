import { Router } from "express"
import { supabase } from "../supabaseClient.js"
import { InvalidIdError, parseNumericId } from "../lib/params.js"

const router = Router()

router.get("/", async (req, res) => {
  const empresaId = req.user!.empresaId
  const search = req.query.search as string | undefined
  const categoria = req.query.categoria as string | undefined

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("nome", { ascending: true })

  if (error) {
    console.error("Erro ao buscar produtos no Supabase:", error)
    return res.status(500).json({ error: "Erro ao buscar produtos" })
  }

  let results = data ?? []

  if (categoria) {
    results = results.filter((p) => p.categoria === categoria)
  }

  if (search?.trim()) {
    const term = search.trim().toLowerCase()
    results = results.filter((p) => {
      const nome = (p.nome as string).toLowerCase()
      const codigoSku = (p.codigo_sku as string).toLowerCase()
      return nome.includes(term) || codigoSku.includes(term)
    })
  }

  res.json(results)
})

router.get("/categorias", async (_req, res) => {
  const empresaId = _req.user!.empresaId

  const { data, error } = await supabase
    .from("produtos")
    .select("categoria")
    .eq("empresa_id", empresaId)

  if (error) {
    console.error("Erro ao buscar categorias de produtos no Supabase:", error)
    return res
      .status(500)
      .json({ error: "Erro ao buscar categorias de produtos" })
  }

  const categoriasUnicas = Array.from(
    new Set((data ?? []).map((p) => p.categoria)),
  ).sort()

  res.json(categoriasUnicas)
})

router.get("/:id", async (req, res) => {
  const empresaId = req.user!.empresaId
  let produtoId: number

  try {
    produtoId = parseNumericId(req.params.id, "id")
  } catch (error) {
    if (error instanceof InvalidIdError) {
      return res.status(400).json({ error: error.message })
    }
    throw error
  }

  const { data: produto, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", produtoId)
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (error) {
    console.error("Erro ao buscar produto no Supabase:", error)
    return res.status(500).json({ error: "Erro ao buscar produto" })
  }

  if (!produto) return res.status(404).json({ error: "Produto não encontrado" })

  res.json(produto)
})

router.post("/", async (req, res) => {
  const empresaId = req.user!.empresaId
  const { nome, descricao, preco, codigoSku, categoria, imagem, ativo } = req.body

  const { data, error } = await supabase
    .from("produtos")
    .insert({
      nome,
      descricao: descricao ?? "",
      preco,
      codigo_sku: codigoSku,
      categoria,
      imagem: imagem ?? "",
      ativo: ativo ?? true,
      empresa_id: empresaId,
    })
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("Erro ao criar produto no Supabase:", error)
    return res.status(500).json({ error: "Erro ao criar produto" })
  }

  return res.status(201).json({ id: data!.id })
})

router.put("/:id", async (req, res) => {
  const empresaId = req.user!.empresaId
  let produtoId: number

  try {
    produtoId = parseNumericId(req.params.id, "id")
  } catch (error) {
    if (error instanceof InvalidIdError) {
      return res.status(400).json({ error: error.message })
    }
    throw error
  }
  const { nome, descricao, preco, codigoSku, categoria, imagem, ativo } = req.body

  const { data, error } = await supabase
    .from("produtos")
    .update({
      nome,
      descricao: descricao ?? "",
      preco,
      codigo_sku: codigoSku,
      categoria,
      imagem: imagem ?? "",
      ativo,
    })
    .eq("id", produtoId)
    .eq("empresa_id", empresaId)
    .select("id")

  if (error) {
    console.error("Erro ao atualizar produto no Supabase:", error)
    return res.status(500).json({ error: "Erro ao atualizar produto" })
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: "Produto não encontrado" })
  }

  res.status(204).end()
})

router.patch("/:id/toggle-ativo", async (req, res) => {
  const empresaId = req.user!.empresaId
  let produtoId: number

  try {
    produtoId = parseNumericId(req.params.id, "id")
  } catch (error) {
    if (error instanceof InvalidIdError) {
      return res.status(400).json({ error: error.message })
    }
    throw error
  }

  const { data: produto, error: fetchError } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", produtoId)
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (fetchError) {
    console.error("Erro ao buscar produto no Supabase:", fetchError)
    return res.status(500).json({ error: "Erro ao buscar produto" })
  }

  if (!produto) return res.status(404).json({ error: "Produto não encontrado" })

  const { error: updateError } = await supabase
    .from("produtos")
    .update({ ativo: !produto.ativo })
    .eq("id", produto.id)

  if (updateError) {
    console.error("Erro ao atualizar produto no Supabase:", updateError)
    return res.status(500).json({ error: "Erro ao atualizar produto" })
  }

  res.status(204).end()
})

router.delete("/:id", async (req, res) => {
  const empresaId = req.user!.empresaId
  let produtoId: number

  try {
    produtoId = parseNumericId(req.params.id, "id")
  } catch (error) {
    if (error instanceof InvalidIdError) {
      return res.status(400).json({ error: error.message })
    }
    throw error
  }

  const { data, error } = await supabase
    .from("produtos")
    .delete()
    .eq("id", produtoId)
    .eq("empresa_id", empresaId)
    .select("id")

  if (error) {
    console.error("Erro ao excluir produto no Supabase:", error)
    return res.status(500).json({ error: "Erro ao excluir produto" })
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: "Produto não encontrado" })
  }

  res.status(204).end()
})

export default router
