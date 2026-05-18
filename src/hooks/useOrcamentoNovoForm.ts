import type { FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthSession } from '../auth/useAuthSession'
import { calcularTotaisOrcamento } from '../domain/orcamento/calculos'
import { descontoVendedorExcedeTeto, mensagemValorMaximoDescontoVendedor } from '../domain/orcamento/descontoVendedor'
import {
  criarOrcamento,
  type ItemForm,
  type PagamentoForm,
} from '../application/orcamento/orcamentoNovoService'
import {
  loadOrcamentoReferencesWithClient,
  type ClienteRef as Cliente,
  type ProdutoRef as Produto,
} from '../repositories/orcamento/orcamentoReadRepo'
import { getCompanySettingsRow } from '../repositories/companySettingsRepository'
import { SUPABASE_NOT_CONFIGURED_MESSAGE } from '../lib/supabaseClient'
import { useSupabase } from '../lib/useSupabase'
import { useAsyncEffect } from './useAsyncEffect'

export function useOrcamentoNovoForm() {
  const navigate = useNavigate()
  const supaStatus = useSupabase()
  const supaClient = supaStatus.kind === 'ready' ? supaStatus.client : null
  const { role } = useAuthSession()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [tetoDescontoVendedor, setTetoDescontoVendedor] = useState<number | null>(null)
  const [loadingRefs, setLoadingRefs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [clienteId, setClienteId] = useState('')
  const [itens, setItens] = useState<ItemForm[]>([])
  const [pagamento, setPagamento] = useState<PagamentoForm>({
    tipo: 'dinheiro',
    valor_entrada: '',
    num_parcelas: '',
    taxa_servico_percentual: '',
    aplicar_taxa: false,
    primeiro_vencimento: '',
    intervalo_dias: '',
  })

  const [modalAberto, setModalAberto] = useState(false)
  const [modalEditIndex, setModalEditIndex] = useState<number | null>(null)

  const carregarRefs = useCallback(async (signal: { cancelled: boolean }) => {
    if (signal.cancelled) return
    setLoadingRefs(true)
    setError(null)

    if (!supaClient) {
      if (!signal.cancelled) {
        setError(
          supaStatus.kind === 'unconfigured'
            ? supaStatus.message
            : SUPABASE_NOT_CONFIGURED_MESSAGE,
        )
      }
      setLoadingRefs(false)
      return
    }

    try {
      const [refs, companyRow] = await Promise.all([
        loadOrcamentoReferencesWithClient(supaClient),
        getCompanySettingsRow(),
      ])
      if (signal.cancelled) return
      setClientes(refs.clientes)
      setProdutos(refs.produtos)
      setTetoDescontoVendedor(companyRow.max_desconto_vendedor_percentual)
    } catch (loadError) {
      if (signal.cancelled) return
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar referências do orçamento.')
    } finally {
      if (!signal.cancelled) {
        setLoadingRefs(false)
      }
    }
  }, [supaClient, supaStatus])

  useAsyncEffect(carregarRefs, [carregarRefs])

  const totais = useMemo(() => calcularTotaisOrcamento(itens), [itens])

  const descontoVendedorBloqueado = useMemo(() => {
    if (role !== 'vendedor' || tetoDescontoVendedor === null) return false
    return descontoVendedorExcedeTeto(totais.subtotal, totais.desconto_total, tetoDescontoVendedor)
  }, [role, tetoDescontoVendedor, totais.subtotal, totais.desconto_total])

  const descontoVendedorMensagem = useMemo<string | null>(() => {
    if (!descontoVendedorBloqueado || tetoDescontoVendedor === null) return null
    return mensagemValorMaximoDescontoVendedor(tetoDescontoVendedor)
  }, [descontoVendedorBloqueado, tetoDescontoVendedor])

  const submitDisabled = saving || descontoVendedorBloqueado || itens.length === 0

  function abrirModalNovo() {
    setModalEditIndex(null)
    setModalAberto(true)
  }

  function abrirModalEditar(index: number) {
    setModalEditIndex(index)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setModalEditIndex(null)
  }

  function salvarItemModal(item: ItemForm, editIndex: number | null) {
    const itensAtualizados =
      editIndex !== null
        ? itens.map((it, i) => (i === editIndex ? item : it))
        : [...itens, item]

    if (role === 'vendedor' && tetoDescontoVendedor !== null) {
      const novosTotais = calcularTotaisOrcamento(itensAtualizados)
      if (descontoVendedorExcedeTeto(novosTotais.subtotal, novosTotais.desconto_total, tetoDescontoVendedor)) {
        toast.error(mensagemValorMaximoDescontoVendedor(tetoDescontoVendedor))
        return
      }
    }

    setItens(itensAtualizados)
    fecharModal()
    toast.success(editIndex !== null ? 'Item atualizado.' : 'Item adicionado.')
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (descontoVendedorBloqueado && descontoVendedorMensagem) {
      setError(descontoVendedorMensagem)
      toast.error(descontoVendedorMensagem)
      return
    }

    setSaving(true)
    try {
      const orcamentoId = await criarOrcamento({
        clienteId,
        itens,
        pagamento,
        totais,
      })
      toast.success('Orçamento criado com sucesso!')
      navigate(`/orcamentos/${orcamentoId}`)
    } catch (submitError) {
      const msg = submitError instanceof Error ? submitError.message : 'Não foi possível criar o orçamento.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return {
    clientes,
    produtos,
    loadingRefs,
    saving,
    error,
    clienteId,
    setClienteId,
    itens,
    pagamento,
    setPagamento,
    totais,
    descontoVendedorBloqueado,
    descontoVendedorMensagem,
    submitDisabled,
    tetoDescontoVendedor,
    role,
    modalAberto,
    modalEditIndex,
    abrirModalNovo,
    abrirModalEditar,
    fecharModal,
    salvarItemModal,
    removerItem,
    handleSubmit,
    navigate,
  }
}

export type OrcamentoNovoForm = ReturnType<typeof useOrcamentoNovoForm>
