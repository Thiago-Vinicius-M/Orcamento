import type { OrcamentoStatus } from '../../domain/orcamento/status'
import { podeAprovar, podeReprovar, podeCancelar, podeExcluir } from '../../domain/orcamento/status'
import {
  atualizarStatusOrcamento,
  excluirOrcamento as excluirOrcamentoRepo,
} from '../../repositories/orcamento/orcamentoWriteRepo'
import type { UserRole } from '../../types/userRole'

export async function aprovarOrcamento(
  id: string,
  status: OrcamentoStatus,
  role: UserRole | null,
): Promise<void> {
  if (!podeAprovar(status, role)) {
    throw new Error('Sem permissão para aprovar este orçamento.')
  }
  await atualizarStatusOrcamento(id, 'vigente')
}

export async function reprovarOrcamento(
  id: string,
  status: OrcamentoStatus,
  role: UserRole | null,
): Promise<void> {
  if (!podeReprovar(status, role)) {
    throw new Error('Sem permissão para reprovar este orçamento.')
  }
  await atualizarStatusOrcamento(id, 'reprovado')
}

export async function cancelarOrcamento(
  id: string,
  status: OrcamentoStatus,
  role: UserRole | null,
): Promise<void> {
  if (!podeCancelar(status, role)) {
    throw new Error('Não é possível cancelar este orçamento.')
  }
  await atualizarStatusOrcamento(id, 'cancelado')
}

export async function excluirOrcamento(
  id: string,
  status: OrcamentoStatus,
  role: UserRole | null,
): Promise<void> {
  if (!podeExcluir(status, role)) {
    throw new Error('Sem permissão para excluir este orçamento.')
  }
  await excluirOrcamentoRepo(id)
}
