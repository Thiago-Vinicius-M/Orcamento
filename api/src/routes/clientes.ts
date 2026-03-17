import { Router } from "express"
import { supabase } from "../supabaseClient.js"
import { InvalidIdError, parseNumericId } from "../lib/params.js"

const router = Router()

router.get("/", async (req, res) => {
  const empresaId = req.user!.empresaId
  const search = req.query.search as string | undefined

  const { data: all, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("nome", { ascending: true })

  if (error) {
    console.error("Erro ao buscar clientes no Supabase:", error)
    return res.status(500).json({ error: "Erro ao buscar clientes" })
  }

  if (search?.trim()) {
    const term = search.trim().toLowerCase()
    const digits = term.replace(/\D/g, "")

    const filtered = all!.filter((c) => {
      if (c.nome.toLowerCase().includes(term)) return true
      if (digits && c.cpfCnpj.replace(/\D/g, "").includes(digits)) return true
      return false
    })
    return res.json(filtered)
  }

  res.json(all ?? [])
})

router.get("/count", async (req, res) => {
  const empresaId = req.user!.empresaId

  const { count, error } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", empresaId)

  if (error) {
    console.error("Erro ao buscar contagem de clientes no Supabase:", error)
    return res.status(500).json({ error: "Erro ao buscar contagem de clientes" })
  }

  res.json({ count: count ?? 0 })
})

router.get("/:id", async (req, res) => {
  const empresaId = req.user!.empresaId
  let clienteId: number

  try {
    clienteId = parseNumericId(req.params.id, "id")
  } catch (error) {
    if (error instanceof InvalidIdError) {
      return res.status(400).json({ error: error.message })
    }
    throw error
  }

  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", clienteId)
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (error) {
    console.error("Erro ao buscar cliente no Supabase:", error)
    return res.status(500).json({ error: "Erro ao buscar cliente" })
  }

  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" })

  res.json(cliente)
})

router.post("/", async (req, res) => {
  const empresaId = req.user!.empresaId
  const {
    nome,
    cpfCnpj,
    telefone,
    email,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
  } = req.body

  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nome,
      cpf_cnpj: cpfCnpj,
      telefone,
      email: email ?? "",
      logradouro: logradouro ?? "",
      numero: numero ?? "",
      complemento: complemento ?? "",
      bairro: bairro ?? "",
      cidade: cidade ?? "",
      estado: estado ?? "",
      cep: cep ?? "",
      empresa_id: empresaId,
    })
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("Erro ao criar cliente no Supabase:", error)
    return res.status(500).json({ error: "Erro ao criar cliente" })
  }

  return res.status(201).json({ id: data!.id })
})

router.put("/:id", async (req, res) => {
  const empresaId = req.user!.empresaId
  let clienteId: number

  try {
    clienteId = parseNumericId(req.params.id, "id")
  } catch (error) {
    if (error instanceof InvalidIdError) {
      return res.status(400).json({ error: error.message })
    }
    throw error
  }
  const {
    nome,
    cpfCnpj,
    telefone,
    email,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
  } = req.body

  const { data, error } = await supabase
    .from("clientes")
    .update({
      nome,
      cpf_cnpj: cpfCnpj,
      telefone,
      email: email ?? "",
      logradouro: logradouro ?? "",
      numero: numero ?? "",
      complemento: complemento ?? "",
      bairro: bairro ?? "",
      cidade: cidade ?? "",
      estado: estado ?? "",
      cep: cep ?? "",
    })
    .eq("id", clienteId)
    .eq("empresa_id", empresaId)
    .select("id")

  if (error) {
    console.error("Erro ao atualizar cliente no Supabase:", error)
    return res.status(500).json({ error: "Erro ao atualizar cliente" })
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: "Cliente não encontrado" })
  }

  res.status(204).end()
})

router.delete("/:id", async (req, res) => {
  const empresaId = req.user!.empresaId
  let clienteId: number

  try {
    clienteId = parseNumericId(req.params.id, "id")
  } catch (error) {
    if (error instanceof InvalidIdError) {
      return res.status(400).json({ error: error.message })
    }
    throw error
  }

  const { data, error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", clienteId)
    .eq("empresa_id", empresaId)
    .select("id")

  if (error) {
    console.error("Erro ao excluir cliente no Supabase:", error)
    return res.status(500).json({ error: "Erro ao excluir cliente" })
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: "Cliente não encontrado" })
  }

  res.status(204).end()
})

export default router
