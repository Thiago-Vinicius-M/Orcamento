import type { FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthSession } from '../auth/useAuthSession'
import { parseDecimalInput } from '../domain/financeiro/numero'
import { calcularTotaisOrcamento } from '../domain/orcamento/calculos'
import type { DescontoInput } from '../domain/orcamento/calculos'
import { descontoVendedorExcedeTeto, mensagemValorMaximoDescontoVendedor } from '../domain/orcamento/descontoVendedor'
import {
  criarOrcamento,
  type DescontoForm,
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
  const [itens, setItens] = useState<ItemForm[]>([
    { produto_id: '', quantidade: '1', preco_unitario: '' },
  ])
  const [pagamento, setPagamento] = useState<PagamentoForm>({
    tipo: 'dinheiro',
    valor_entrada: '',
    num_parcelas: '',
    taxa_servico_percentual: '',
    aplicar_taxa: false,
  })
  const [desconto, setDesconto] = useState<DescontoForm>({ tipo: '', valor: '' })

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

  const descontoInput: DescontoInput | undefined = useMemo(() => {
    if (!desconto.tipo) return undefined
    return { tipo: desconto.tipo as 'percentual' | 'fixo', valor: parseDecimalInput(desconto.valor) }
  }, [desconto])

  const totais = useMemo(() => calcularTotaisOrcamento(itens, descontoInput), [itens, descontoInput])

  /**
   * Trava de UI aplicada apenas ao perfil `vendedor` quando há teto configurado.
   * Gerente sempre passa livre no cliente (validação server-side cobre defesa em profundidade).
   */
  const descontoVendedorBloqueado = useMemo(() => {
    if (role !== 'vendedor' || tetoDescontoVendedor === null) {
      return false
    }
    return descontoVendedorExcedeTeto(totais.subtotal, totais.desconto_total, tetoDescontoVendedor)
  }, [role, tetoDescontoVendedor, totais.subtotal, totais.desconto_total])

  const descontoVendedorMensagem = useMemo<string | null>(() => {
    if (!descontoVendedorBloqueado || tetoDescontoVendedor === null) {
      return null
    }
    return mensagemValorMaximoDescontoVendedor(tetoDescontoVendedor)
  }, [descontoVendedorBloqueado, tetoDescontoVendedor])

  const submitDisabled = saving || descontoVendedorBloqueado

  function atualizarItem(index: number, patch: Partial<ItemForm>) {
    setItens((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function adicionarItem() {
    setItens((prev) => [...prev, { produto_id: '', quantidade: '1', preco_unitario: '' }])
  }

  function removerItem(index: number) {
    setItens((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  function handleProdutoChange(index: number, produtoId: string) {
    const produto = produtos.find((p) => p.id === produtoId)
    atualizarItem(index, {
      produto_id: produtoId,
      preco_unitario: produto ? produto.preco_unitario.toFixed(2) : '',
    })
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
        desconto,
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
    desconto,
    setDesconto,
    totais,
    descontoVendedorBloqueado,
    descontoVendedorMensagem,
    submitDisabled,
    atualizarItem,
    adicionarItem,
    removerItem,
    handleProdutoChange,
    handleSubmit,
    navigate,
  }
}

export type OrcamentoNovoForm = ReturnType<typeof useOrcamentoNovoForm>
