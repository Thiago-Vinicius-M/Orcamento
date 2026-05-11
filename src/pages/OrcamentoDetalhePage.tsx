import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { carregarOrcamentoDetalhe } from '../application/orcamento/orcamentoDetalheService'
import { gerarEBaixarPdfOrcamento } from '../application/orcamento/orcamentoPdfClientService'
import {
  aprovarOrcamento,
  reprovarOrcamento,
  cancelarOrcamento,
  excluirOrcamento,
} from '../application/orcamento/orcamentoAcoesService'
import type {
  OrcamentoDetalhe,
  OrcamentoItemDetalhe,
  OrcamentoPagamentoDetalhe,
} from '../application/orcamento/orcamentoDetalheTypes'
import {
  formatarStatusOrcamento,
  getStatusPillClassName,
  podeAprovar,
  podeReprovar,
  podeCancelar,
  podeExcluir,
  podeGerarPdf,
} from '../domain/orcamento/status'
import { useUserRole } from '../hooks/useUserRole'
import { PageHeader, StatusPill, LoadingState, EmptyState, ActionButton, DataTable, type Column } from '../components'

export function OrcamentoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { role } = useUserRole()
  const [orcamento, setOrcamento] = useState<OrcamentoDetalhe | null>(null)
  const [itens, setItens] = useState<OrcamentoItemDetalhe[]>([])
  const [pagamento, setPagamento] = useState<OrcamentoPagamentoDetalhe | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const carregar = useCallback(
    async (orcamentoId: string, isCancelled: () => boolean) => {
      if (isCancelled()) return
      setLoading(true)
      setError(null)

      try {
        const detalhe = await carregarOrcamentoDetalhe(orcamentoId)
        if (isCancelled()) return

        setOrcamento(detalhe.orcamento)
        setItens(detalhe.itens)
        setPagamento(detalhe.pagamento)

        if (!detalhe.orcamento) {
          setError('Orçamento não encontrado ou você não tem acesso.')
        }
      } catch (err) {
        if (isCancelled()) return
        const message = err instanceof Error ? err.message : 'Erro ao carregar orçamento.'
        setError(message)
      }

      if (isCancelled()) return
      setLoading(false)
    },
    [],
  )

  useEffect(() => {
    if (!id) return

    let cancelled = false
    const timeout = window.setTimeout(() => {
      void carregar(id, () => cancelled)
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [carregar, id])

  const recarregar = useCallback(() => {
    if (!id) return
    let cancelled = false
    void carregar(id, () => cancelled)
    return () => { cancelled = true }
  }, [carregar, id])

  async function executarAcao(
    acao: () => Promise<void>,
    confirmMsg: string,
    successMsg: string,
  ) {
    if (!window.confirm(confirmMsg)) return
    setActionLoading(true)
    setError(null)
    try {
      await acao()
      recarregar()
      toast.success(successMsg)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao executar ação.'
      setError(msg)
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  function handleAprovar() {
    if (!orcamento) return
    void executarAcao(
      () => aprovarOrcamento(orcamento.id, orcamento.status, role),
      'Tem certeza que deseja aprovar este orçamento?',
      'Orçamento aprovado com sucesso!',
    )
  }

  function handleReprovar() {
    if (!orcamento) return
    void executarAcao(
      () => reprovarOrcamento(orcamento.id, orcamento.status, role),
      'Tem certeza que deseja reprovar este orçamento?',
      'Orçamento reprovado.',
    )
  }

  function handleCancelar() {
    if (!orcamento) return
    void executarAcao(
      () => cancelarOrcamento(orcamento.id, orcamento.status, role),
      'Tem certeza que deseja cancelar este orçamento?',
      'Orçamento cancelado.',
    )
  }

  async function handleGerarPdf() {
    if (!orcamento) return
    setPdfLoading(true)
    setError(null)
    try {
      await gerarEBaixarPdfOrcamento(orcamento.id)
      toast.success('PDF gerado com sucesso.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar PDF.'
      setError(msg)
      toast.error(msg)
    } finally {
      setPdfLoading(false)
    }
  }

  function handleExcluir() {
    if (!orcamento) return
    const confirmMsg = 'Tem certeza que deseja EXCLUIR este orçamento? Esta ação é irreversível.'
    if (!window.confirm(confirmMsg)) return
    setActionLoading(true)
    setError(null)
    void (async () => {
      try {
        await excluirOrcamento(orcamento.id, orcamento.status, role)
        toast.success('Orçamento excluído com sucesso.')
        navigate('/orcamentos')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao excluir orçamento.'
        setError(msg)
        toast.error(msg)
        setActionLoading(false)
      }
    })()
  }

  const titulo = orcamento
    ? `Orçamento ${orcamento.id.slice(0, 8).toUpperCase()}`
    : 'Orçamento'

  const mostrarAprovar = orcamento && podeAprovar(orcamento.status, role)
  const mostrarReprovar = orcamento && podeReprovar(orcamento.status, role)
  const mostrarCancelar = orcamento && podeCancelar(orcamento.status, role)
  const mostrarExcluir = orcamento && podeExcluir(orcamento.status, role)
  const mostrarGerarPdf = orcamento && podeGerarPdf(orcamento.status)
  const temAcoes =
    mostrarAprovar || mostrarReprovar || mostrarCancelar || mostrarExcluir || mostrarGerarPdf

  const itensColumns: Column<OrcamentoItemDetalhe>[] = [
    {
      header: 'Produto',
      accessor: (item) =>
        item.produto_codigo && item.produto_codigo !== '—'
          ? `${item.produto_codigo} - ${item.produto_nome}`
          : item.produto_nome,
    },
    { header: 'Qtd.', accessor: (item) => item.quantidade },
    { header: 'Preço unit. (R$)', accessor: (item) => `R$ ${item.preco_unitario.toFixed(2)}` },
    { header: 'Subtotal (R$)', accessor: (item) => `R$ ${item.subtotal.toFixed(2)}` },
  ]

  return (
    <>
      <PageHeader
        title={titulo}
        subtitle="Detalhes do orçamento, com itens, condição de pagamento e validade de 30 dias a partir da criação (salvo alterações futuras de status)."
        error={error}
      />

      {loading && (
        <div className="card">
          <LoadingState message="Carregando orçamento..." />
        </div>
      )}

      {orcamento && (
        <div className="page-grid section-mt-sm">
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

          <section className="card">
            <header className="card-header">
              <h2>Itens</h2>
            </header>
            {itens.length === 0 ? (
              <EmptyState message="Nenhum item cadastrado." />
            ) : (
              <DataTable
                columns={itensColumns}
                data={itens}
                rowKey={(item) => item.id}
              />
            )}

            <footer className="card-footer card-footer-right">
              <div className="totais-grid">
                <div>
                  <span className="text-muted">Subtotal</span>
                  <div>R$ {orcamento.subtotal.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-muted">Descontos</span>
                  <div>R$ {orcamento.desconto_total.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-muted">Total</span>
                  <div className="totais-total">R$ {orcamento.total.toFixed(2)}</div>
                </div>
              </div>
            </footer>
          </section>

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
                {pagamento.tipo === 'financiamento' && (
                  <>
                    <div>
                      <span className="text-muted">Valor de entrada</span>
                      <div>
                        {pagamento.valor_entrada != null
                          ? `R$ ${pagamento.valor_entrada.toFixed(2)}`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted">Número de parcelas</span>
                      <div>
                        {pagamento.num_parcelas != null
                          ? `${pagamento.num_parcelas}x`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted">Taxa de serviço (%)</span>
                      <div>
                        {pagamento.taxa_servico_percentual != null
                          ? `${pagamento.taxa_servico_percentual.toFixed(2)}%`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted">Aplicar taxa</span>
                      <div>{pagamento.aplicar_taxa ? 'Sim' : 'Não'}</div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <EmptyState message="Condição de pagamento não cadastrada para este orçamento." />
            )}
          </section>

          {temAcoes && (
            <section className="card">
              <header className="card-header">
                <h2>Ações</h2>
              </header>
              <div className="actions-row">
                {mostrarGerarPdf && (
                  <ActionButton
                    variant="primary"
                    disabled={pdfLoading}
                    onClick={() => void handleGerarPdf()}
                    aria-label={`Gerar PDF do orçamento ${titulo}`}
                  >
                    {pdfLoading ? 'Gerando PDF…' : 'Gerar PDF'}
                  </ActionButton>
                )}

                {mostrarAprovar && (
                  <ActionButton variant="success" disabled={actionLoading} onClick={handleAprovar} aria-label={`Aprovar orçamento ${titulo}`}>
                    Aprovar
                  </ActionButton>
                )}

                {mostrarReprovar && (
                  <ActionButton variant="danger" disabled={actionLoading} onClick={handleReprovar} aria-label={`Reprovar orçamento ${titulo}`}>
                    Reprovar
                  </ActionButton>
                )}

                {mostrarCancelar && (
                  <ActionButton variant="warning" disabled={actionLoading} onClick={handleCancelar} aria-label={`Cancelar orçamento ${titulo}`}>
                    Cancelar
                  </ActionButton>
                )}

                {mostrarExcluir && (
                  <ActionButton variant="outline-danger" disabled={actionLoading} onClick={handleExcluir} aria-label={`Excluir orçamento ${titulo}`}>
                    Excluir
                  </ActionButton>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}
