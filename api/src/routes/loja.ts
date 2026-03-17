import { Router } from "express"
import { supabase } from "../supabaseClient.js"

const router = Router()

router.get("/", async (req, res) => {
  const empresaId = req.user!.empresaId

  const { data, error } = await supabase
    .from("lojas")
    .select("*")
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (error) {
    console.error("Erro ao buscar loja no Supabase:", error)
    return res.status(500).json({ error: "Erro ao buscar loja" })
  }

  res.json(data ?? null)
})

router.put("/", async (req, res) => {
  const empresaId = req.user!.empresaId
  const { nome, cnpj, endereco, telefone, email, logo } = req.body

  const { data: existing, error: fetchError } = await supabase
    .from("lojas")
    .select("*")
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (fetchError) {
    console.error("Erro ao buscar loja no Supabase:", fetchError)
    return res.status(500).json({ error: "Erro ao buscar loja" })
  }

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from("lojas")
      .update({ nome, cnpj, endereco, telefone, email, logo })
      .eq("id", existing.id)
      .select()
      .maybeSingle()

    if (updateError) {
      console.error("Erro ao atualizar loja no Supabase:", updateError)
      return res.status(500).json({ error: "Erro ao atualizar loja" })
    }

    return res.json(updated)
  }

  const { data: created, error: insertError } = await supabase
    .from("lojas")
    .insert({
      nome,
      cnpj,
      endereco,
      telefone,
      email,
      logo,
      empresa_id: empresaId,
    })
    .select()
    .maybeSingle()

  if (insertError) {
    console.error("Erro ao criar loja no Supabase:", insertError)
    return res.status(500).json({ error: "Erro ao criar loja" })
  }

  return res.status(201).json(created)
})

export default router
