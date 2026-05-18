import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useConfirm } from '../components/ConfirmModal'
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
  podeAprovar,
  podeReprovar,
  podeCancelar,
  podeExcluir,
  podeGerarPdf,
} from '../domain/orcamento/status'
import { useUserRole } from './useUserRole'
import { useAsyncEffect } from './useAsyncEffect'

export function useOrcamentoDetalhe(orcamentoId: string | undefined) {
  const navigate = useNavigate()
  const { role } = useUserRole()
  const confirm = useConfirm()
  const [orcamento, setOrcamento] = useState<OrcamentoDetalhe | null>(null)
  const [itens, setItens] = useState<OrcamentoItemDetalhe[]>([])
  const [pagamento, setPagamento] = useState<OrcamentoPagamentoDetalhe | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const carregar = useCallback(async (id: string, signal: { cancelled: boolean }) => {
    if (signal.cancelled) return
    setLoading(true)
    setError(null)

    try {
      const detalhe = await carregarOrcamentoDetalhe(id)
      if (signal.cancelled) return

      setOrcamento(detalhe.orcamento)
      setItens(detalhe.itens)
      setPagamento(detalhe.pagamento)

      if (!detalhe.orcamento) {
        setError('Orçamento não encontrado ou você não tem acesso.')
      }
    } catch (err) {
      if (signal.cancelled) return
      const message = err instanceof Error ? err.message : 'Erro ao carregar orçamento.'
      setError(message)
    }

    if (signal.cancelled) return
    setLoading(false)
  }, [])

  useAsyncEffect(
    async (signal) => {
      if (!orcamentoId) return
      await carregar(orcamentoId, signal)
    },
    [carregar, orcamentoId],
  )

  const recarregar = useCallback(() => {
    if (!orcamentoId) return
    void carregar(orcamentoId, { cancelled: false })
  }, [carregar, orcamentoId])

  async function executarAcao(
    acao: () => Promise<void>,
    confirmTitle: string,
    confirmMsg: string,
    successMsg: string,
  ) {
    const confirmed = await confirm({ title: confirmTitle, message: confirmMsg, variant: 'warning' })
    if (!confirmed) return
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
      'Aprovar Orçamento',
      'Tem certeza que deseja aprovar este orçamento?',
      'Orçamento aprovado com sucesso!',
    )
  }

  function handleReprovar() {
    if (!orcamento) return
    void executarAcao(
      () => reprovarOrcamento(orcamento.id, orcamento.status, role),
      'Reprovar Orçamento',
      'Tem certeza que deseja reprovar este orçamento?',
      'Orçamento reprovado.',
    )
  }

  function handleCancelar() {
    if (!orcamento) return
    void executarAcao(
      () => cancelarOrcamento(orcamento.id, orcamento.status, role),
      'Cancelar Orçamento',
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

  async function handleExcluir() {
    if (!orcamento) return
    const confirmed = await confirm({
      title: 'Excluir Orçamento',
      message: 'Tem certeza que deseja EXCLUIR este orçamento? Esta ação é irreversível.',
      variant: 'danger',
      confirmLabel: 'Excluir',
    })
    if (!confirmed) return
    setActionLoading(true)
    setError(null)
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
  }

  const titulo = useMemo(
    () => (orcamento ? `Orçamento ${orcamento.id.slice(0, 8).toUpperCase()}` : 'Orçamento'),
    [orcamento],
  )

  const mostrarAprovar = Boolean(orcamento && podeAprovar(orcamento.status, role))
  const mostrarReprovar = Boolean(orcamento && podeReprovar(orcamento.status, role))
  const mostrarCancelar = Boolean(orcamento && podeCancelar(orcamento.status, role))
  const mostrarExcluir = Boolean(orcamento && podeExcluir(orcamento.status, role))
  const mostrarGerarPdf = Boolean(orcamento && podeGerarPdf(orcamento.status))
  const temAcoes = mostrarAprovar || mostrarReprovar || mostrarCancelar || mostrarExcluir || mostrarGerarPdf

  return {
    orcamento,
    itens,
    pagamento,
    loading,
    error,
    actionLoading,
    pdfLoading,
    titulo,
    mostrarAprovar,
    mostrarReprovar,
    mostrarCancelar,
    mostrarExcluir,
    mostrarGerarPdf,
    temAcoes,
    handleAprovar,
    handleReprovar,
    handleCancelar,
    handleGerarPdf,
    handleExcluir,
  }
}
