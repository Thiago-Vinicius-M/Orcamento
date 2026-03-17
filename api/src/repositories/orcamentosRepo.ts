import { supabase } from "../supabaseClient.js"

export type OrcamentoVigenteParaExpirarRow = {
  id: number
  status: string
  data_validade: string | null
}

export async function listVigentesParaExpirar(
  empresaId: number,
): Promise<OrcamentoVigenteParaExpirarRow[]> {
  const { data, error } = await supabase
    .from("orcamentos")
    .select("id, status, data_validade")
    .eq("status", "vigente")
    .eq("empresa_id", empresaId)

  if (error) {
    throw error
  }

  return (data ?? []) as OrcamentoVigenteParaExpirarRow[]
}

export async function updateStatusExpirados(
  empresaId: number,
  idsExpirados: number[],
): Promise<void> {
  if (idsExpirados.length === 0) return

  const { error } = await supabase
    .from("orcamentos")
    .update({ status: "expirado" })
    .in("id", idsExpirados)
    .eq("empresa_id", empresaId)

  if (error) {
    throw error
  }
}

