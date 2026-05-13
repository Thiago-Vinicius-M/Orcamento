import { useParams } from 'react-router-dom'
import { PageHeader, LoadingState } from '../components'
import { useOrcamentoDetalhe } from '../hooks/useOrcamentoDetalhe'
import { OrcamentoDetalheAcoes } from './OrcamentoDetalhe/OrcamentoDetalheAcoes'
import { OrcamentoDetalheItensList } from './OrcamentoDetalhe/OrcamentoDetalheItensList'
import { OrcamentoDetalhePagamentoResumo } from './OrcamentoDetalhe/OrcamentoDetalhePagamentoResumo'
import { OrcamentoDetalheResumo } from './OrcamentoDetalhe/OrcamentoDetalheResumo'

export function OrcamentoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const detalhe = useOrcamentoDetalhe(id)

  return (
    <>
      <PageHeader
        title={detalhe.titulo}
        subtitle="Detalhes do orçamento, com itens, condição de pagamento e validade de 30 dias a partir da criação (salvo alterações futuras de status)."
        error={detalhe.error}
      />

      {detalhe.loading && (
        <div className="card">
          <LoadingState message="Carregando orçamento..." />
        </div>
      )}

      {detalhe.orcamento && (
        <div className="page-grid section-mt-sm">
          <OrcamentoDetalheResumo orcamento={detalhe.orcamento} />
          <OrcamentoDetalheItensList itens={detalhe.itens} orcamento={detalhe.orcamento} />
          <OrcamentoDetalhePagamentoResumo pagamento={detalhe.pagamento} />
          <OrcamentoDetalheAcoes
            titulo={detalhe.titulo}
            temAcoes={detalhe.temAcoes}
            mostrarGerarPdf={detalhe.mostrarGerarPdf}
            mostrarAprovar={detalhe.mostrarAprovar}
            mostrarReprovar={detalhe.mostrarReprovar}
            mostrarCancelar={detalhe.mostrarCancelar}
            mostrarExcluir={detalhe.mostrarExcluir}
            pdfLoading={detalhe.pdfLoading}
            actionLoading={detalhe.actionLoading}
            onGerarPdf={detalhe.handleGerarPdf}
            onAprovar={detalhe.handleAprovar}
            onReprovar={detalhe.handleReprovar}
            onCancelar={detalhe.handleCancelar}
            onExcluir={detalhe.handleExcluir}
          />
        </div>
      )}
    </>
  )
}
