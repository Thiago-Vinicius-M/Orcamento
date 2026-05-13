import { ActionButton } from '../../components'

type Props = {
  titulo: string
  temAcoes: boolean
  mostrarGerarPdf: boolean
  mostrarAprovar: boolean
  mostrarReprovar: boolean
  mostrarCancelar: boolean
  mostrarExcluir: boolean
  pdfLoading: boolean
  actionLoading: boolean
  onGerarPdf: () => void
  onAprovar: () => void
  onReprovar: () => void
  onCancelar: () => void
  onExcluir: () => void
}

export function OrcamentoDetalheAcoes({
  titulo,
  temAcoes,
  mostrarGerarPdf,
  mostrarAprovar,
  mostrarReprovar,
  mostrarCancelar,
  mostrarExcluir,
  pdfLoading,
  actionLoading,
  onGerarPdf,
  onAprovar,
  onReprovar,
  onCancelar,
  onExcluir,
}: Props) {
  if (!temAcoes) return null

  return (
    <section className="card">
      <header className="card-header">
        <h2>Ações</h2>
      </header>
      <div className="actions-row">
        {mostrarGerarPdf && (
          <ActionButton
            variant="primary"
            disabled={pdfLoading}
            onClick={() => void onGerarPdf()}
            aria-label={`Gerar PDF do orçamento ${titulo}`}
          >
            {pdfLoading ? 'Gerando PDF…' : 'Gerar PDF'}
          </ActionButton>
        )}

        {mostrarAprovar && (
          <ActionButton
            variant="success"
            disabled={actionLoading}
            onClick={onAprovar}
            aria-label={`Aprovar orçamento ${titulo}`}
          >
            Aprovar
          </ActionButton>
        )}

        {mostrarReprovar && (
          <ActionButton
            variant="danger"
            disabled={actionLoading}
            onClick={onReprovar}
            aria-label={`Reprovar orçamento ${titulo}`}
          >
            Reprovar
          </ActionButton>
        )}

        {mostrarCancelar && (
          <ActionButton
            variant="warning"
            disabled={actionLoading}
            onClick={onCancelar}
            aria-label={`Cancelar orçamento ${titulo}`}
          >
            Cancelar
          </ActionButton>
        )}

        {mostrarExcluir && (
          <ActionButton
            variant="outline-danger"
            disabled={actionLoading}
            onClick={onExcluir}
            aria-label={`Excluir orçamento ${titulo}`}
          >
            Excluir
          </ActionButton>
        )}
      </div>
    </section>
  )
}
