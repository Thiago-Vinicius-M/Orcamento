import type { UserRole } from '../../types/userRole'
import { OrcamentoTransitionError } from './orcamentoErrors'
import type { OrcamentoStatus } from './status'
import { orcamentoStateMachine } from './status'

/**
 * Entidade de orçamento (ciclo de vida / transições).
 * Persistência continua nos serviços que chamam o repositório.
 */
export class Orcamento {
  private readonly state: { id: string; status: OrcamentoStatus }

  constructor(state: { id: string; status: OrcamentoStatus }) {
    this.state = state
  }

  get id(): string {
    return this.state.id
  }

  get status(): OrcamentoStatus {
    return this.state.status
  }

  aprovar(role: UserRole | null): OrcamentoStatus {
    if (
      !orcamentoStateMachine.podeExecutar('aprovar', { status: this.state.status, role })
    ) {
      throw new OrcamentoTransitionError('Sem permissão para aprovar este orçamento.')
    }
    const next = orcamentoStateMachine.proximoStatus('aprovar', this.state.status)
    if (!next) {
      throw new OrcamentoTransitionError('Transição inválida ao aprovar.')
    }
    return next
  }

  reprovar(role: UserRole | null): OrcamentoStatus {
    if (
      !orcamentoStateMachine.podeExecutar('reprovar', { status: this.state.status, role })
    ) {
      throw new OrcamentoTransitionError('Sem permissão para reprovar este orçamento.')
    }
    const next = orcamentoStateMachine.proximoStatus('reprovar', this.state.status)
    if (!next) {
      throw new OrcamentoTransitionError('Transição inválida ao reprovar.')
    }
    return next
  }

  cancelar(role: UserRole | null): OrcamentoStatus {
    if (
      !orcamentoStateMachine.podeExecutar('cancelar', { status: this.state.status, role })
    ) {
      throw new OrcamentoTransitionError('Não é possível cancelar este orçamento.')
    }
    const next = orcamentoStateMachine.proximoStatus('cancelar', this.state.status)
    if (!next) {
      throw new OrcamentoTransitionError('Transição inválida ao cancelar.')
    }
    return next
  }

  excluir(role: UserRole | null): void {
    if (!orcamentoStateMachine.podeExecutar('excluir', { status: this.state.status, role })) {
      throw new OrcamentoTransitionError('Sem permissão para excluir este orçamento.')
    }
  }

  podeGerarPdf(): boolean {
    return orcamentoStateMachine.podeExecutar('gerarPdf', {
      status: this.state.status,
      role: null,
    })
  }
}
