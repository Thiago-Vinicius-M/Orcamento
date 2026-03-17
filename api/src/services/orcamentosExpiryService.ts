import { getIdsExpirados } from "../lib/orcamentoDomain.js"
import {
  listVigentesParaExpirar,
  updateStatusExpirados,
} from "../repositories/orcamentosRepo.js"

export async function marcarExpirados(empresaId: number): Promise<void> {
  const vigentes = await listVigentesParaExpirar(empresaId)

  const idsExpirados = getIdsExpirados(
    vigentes
      .filter((o) => Boolean(o.data_validade))
      .map((o) => ({
        id: o.id,
        status: o.status,
        dataValidade: new Date(o.data_validade as string),
      })),
  )

  await updateStatusExpirados(empresaId, idsExpirados)
}

