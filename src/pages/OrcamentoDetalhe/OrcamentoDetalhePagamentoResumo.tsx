import { useMemo } from 'react'
import type { OrcamentoPagamentoDetalhe } from '../../application/orcamento/orcamentoDetalheTypes'
import { isPagamentoFinanciamento, pagamentoFromDetalheRow } from '../../domain/orcamento/pagamento'
import { EmptyState } from '../../components'

type Props = { pagamento: OrcamentoPagamentoDetalhe | null }

export function OrcamentoDetalhePagamentoResumo({ pagamento }: Props) {
  const pagamentoModel = useMemo(
    () => (pagamento ? pagamentoFromDetalheRow(pagamento) : null),
    [pagamento],
  )

  return (
    <section className="card">
      <header className="card-header">
        <h2>Condição de pagamento</h2>
      </header>

      {pagamento ? (
        <div className="card-body-grid">
          <div>
            <span className="text-muted">Tipo</span>
            <div>{pagamento.tipo}</div>
          </div>
          {pagamentoModel != null && isPagamentoFinanciamento(pagamentoModel) && (
            <>
              <div>
                <span className="text-muted">Valor de entrada</span>
                <div>
                  {pagamentoModel.valor_entrada != null ? `R$ ${pagamentoModel.valor_entrada.toFixed(2)}` : '—'}
                </div>
              </div>
              <div>
                <span className="text-muted">Número de parcelas</span>
                <div>
                  {pagamentoModel.num_parcelas != null ? `${pagamentoModel.num_parcelas}x` : '—'}
                </div>
              </div>
              <div>
                <span className="text-muted">Taxa de serviço (%)</span>
                <div>
                  {pagamentoModel.taxa_servico_percentual != null
                    ? `${pagamentoModel.taxa_servico_percentual.toFixed(2)}%`
                    : '—'}
                </div>
              </div>
              <div>
                <span className="text-muted">Aplicar taxa</span>
                <div>{pagamentoModel.aplicar_taxa ? 'Sim' : 'Não'}</div>
              </div>
            </>
          )}
        </div>
      ) : (
        <EmptyState message="Condição de pagamento não cadastrada para este orçamento." />
      )}
    </section>
  )
}
