import { formatarStatusOrcamento, getStatusPillClassName } from '../../domain/orcamento/status'
import { StatusPill } from '../../components'
import type { OrcamentoDetalhe } from '../../application/orcamento/orcamentoDetalheTypes'

type Props = { orcamento: OrcamentoDetalhe }

export function OrcamentoDetalheResumo({ orcamento }: Props) {
  return (
    <section className="card">
      <header className="card-header">
        <h2>Resumo</h2>
      </header>
      <div className="card-body-grid">
        <div>
          <span className="text-muted">Cliente</span>
          <div>{orcamento.cliente_nome}</div>
        </div>
        <div>
          <span className="text-muted">Gerado por</span>
          <div>{orcamento.gerado_por_nome}</div>
        </div>
        <div>
          <span className="text-muted">Status</span>
          <div>
            <StatusPill variant={getStatusPillClassName(orcamento.status)}>
              {formatarStatusOrcamento(orcamento.status)}
            </StatusPill>
          </div>
        </div>
        <div>
          <span className="text-muted">Criado em</span>
          <div>{new Date(orcamento.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
        <div>
          <span className="text-muted">Válido até</span>
          <div>{new Date(orcamento.validade_ate).toLocaleDateString('pt-BR')}</div>
        </div>
      </div>
    </section>
  )
}
