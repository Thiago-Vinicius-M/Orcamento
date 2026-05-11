import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { parseDecimalInput } from '../domain/financeiro/numero'
import { calcularSubtotalItem, calcularTotaisOrcamento } from '../domain/orcamento/calculos'
import {
  criarOrcamento,
  type DescontoForm,
  type ItemForm,
  type PagamentoForm,
  type PagamentoTipo,
} from '../application/orcamento/orcamentoNovoService'
import type { DescontoInput } from '../domain/orcamento/calculos'
import {
  loadOrcamentoReferences,
  type ClienteRef as Cliente,
  type ProdutoRef as Produto,
} from '../repositories/orcamentoSupabaseRepository'

export function OrcamentoNovoPage() {
  const navigate = useNavigate()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
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

  const carregarRefs = useCallback(async (isCancelled: () => boolean) => {
    if (isCancelled()) return
    setLoadingRefs(true)
    setError(null)

    try {
      const refs = await loadOrcamentoReferences()
      if (isCancelled()) return
      setClientes(refs.clientes)
      setProdutos(refs.produtos)
    } catch (loadError) {
      if (isCancelled()) return
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar referências do orçamento.')
    } finally {
      if (!isCancelled()) {
        setLoadingRefs(false)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      void carregarRefs(() => cancelled)
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [carregarRefs])

  const descontoInput: DescontoInput | undefined = useMemo(() => {
    if (!desconto.tipo) return undefined
    return { tipo: desconto.tipo as 'percentual' | 'fixo', valor: parseDecimalInput(desconto.valor) }
  }, [desconto])

  const totais = useMemo(() => {
    return calcularTotaisOrcamento(itens, descontoInput)
  }, [itens, descontoInput])

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

  return (
    <>
      <h1>Novo orçamento</h1>
      <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
        Monte o orçamento com itens de produtos e defina a condição de pagamento. A
        validade padrão é de 30 dias a partir de hoje.
      </p>

      {error && <div className="page-error" role="alert" aria-live="assertive">{error}</div>}

      <form onSubmit={handleSubmit} className="page-grid" style={{ marginTop: '1rem' }}>
        <section className="card">
          <header className="card-header">
            <h2>Dados principais</h2>
          </header>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="orc_cliente">Cliente *</label>
              <select
                id="orc_cliente"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                disabled={loadingRefs}
                required
              >
                <option value="">Selecione um cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label>Validade</label>
              <input
                type="text"
                disabled
                value="30 dias a partir da data de criação"
              />
            </div>
          </div>
        </section>

        <section className="card">
          <header className="card-header card-header-row">
            <h2>Itens do orçamento</h2>
            <button
              type="button"
              className="btn-secondary"
              onClick={adicionarItem}
              disabled={loadingRefs}
            >
              + Adicionar item
            </button>
          </header>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Produto</th>
                  <th scope="col">Qtd.</th>
                  <th scope="col">Preço unit. (R$)</th>
                  <th scope="col">Subtotal (R$)</th>
                  <th scope="col" style={{ width: '1%' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, index) => {
                  const qtd = parseDecimalInput(item.quantidade)
                  const preco = parseDecimalInput(item.preco_unitario)
                  const subtotal = calcularSubtotalItem(qtd, preco)
                  return (
                    <tr key={index}>
                      <td>
                        <select
                          value={item.produto_id}
                          onChange={(e) =>
                            handleProdutoChange(index, e.target.value)
                          }
                          required
                        >
                          <option value="">Selecione</option>
                          {produtos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.codigo ? `${p.codigo} - ${p.nome}` : p.nome}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantidade}
                          onChange={(e) =>
                            atualizarItem(index, { quantidade: e.target.value })
                          }
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.preco_unitario}
                          onChange={(e) =>
                            atualizarItem(index, { preco_unitario: e.target.value })
                          }
                          required
                        />
                      </td>
                      <td>R$ {subtotal.toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-link-danger"
                          onClick={() => removerItem(index)}
                          disabled={itens.length <= 1}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="form-grid" style={{ padding: '1rem' }}>
            <div className="form-row">
              <label htmlFor="desc_tipo">Tipo de desconto</label>
              <select
                id="desc_tipo"
                value={desconto.tipo}
                onChange={(e) =>
                  setDesconto((prev) => ({
                    ...prev,
                    tipo: e.target.value as DescontoForm['tipo'],
                    valor: e.target.value === '' ? '' : prev.valor,
                  }))
                }
              >
                <option value="">Sem desconto</option>
                <option value="percentual">Percentual (%)</option>
                <option value="fixo">Valor fixo (R$)</option>
              </select>
            </div>

            {desconto.tipo !== '' && (
              <div className="form-row">
                <label htmlFor="desc_valor">
                  {desconto.tipo === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}
                </label>
                <input
                  id="desc_valor"
                  type="number"
                  min="0"
                  step="0.01"
                  max={desconto.tipo === 'percentual' ? '100' : undefined}
                  value={desconto.valor}
                  onChange={(e) =>
                    setDesconto((prev) => ({ ...prev, valor: e.target.value }))
                  }
                  placeholder={desconto.tipo === 'percentual' ? 'Ex: 10' : 'Ex: 50.00'}
                />
              </div>
            )}
          </div>

          <footer className="card-footer card-footer-right">
            <div className="totais-grid">
              <div>
                <span className="text-muted">Subtotal</span>
                <div>R$ {totais.subtotal.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-muted">Descontos</span>
                <div>R$ {totais.desconto_total.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-muted">Total</span>
                <div className="totais-total">R$ {totais.total.toFixed(2)}</div>
              </div>
            </div>
          </footer>
        </section>

        <section className="card">
          <header className="card-header">
            <h2>Condição de pagamento</h2>
          </header>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="pag_tipo">Tipo de pagamento</label>
              <select
                id="pag_tipo"
                value={pagamento.tipo}
                onChange={(e) =>
                  setPagamento((prev) => ({
                    ...prev,
                    tipo: e.target.value as PagamentoTipo,
                  }))
                }
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="pix">Pix</option>
                <option value="boleto">Boleto</option>
                <option value="financiamento">Financiamento</option>
              </select>
            </div>

            {pagamento.tipo === 'financiamento' && (
              <>
                <div className="form-row">
                  <label htmlFor="pag_valor_entrada">Valor de entrada (R$)</label>
                  <input
                    id="pag_valor_entrada"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pagamento.valor_entrada}
                    onChange={(e) =>
                      setPagamento((prev) => ({ ...prev, valor_entrada: e.target.value }))
                    }
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="pag_num_parcelas">Número de parcelas</label>
                  <input
                    id="pag_num_parcelas"
                    type="number"
                    min="1"
                    step="1"
                    value={pagamento.num_parcelas}
                    onChange={(e) =>
                      setPagamento((prev) => ({ ...prev, num_parcelas: e.target.value }))
                    }
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="pag_taxa">Taxa de serviço (%)</label>
                  <input
                    id="pag_taxa"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pagamento.taxa_servico_percentual}
                    onChange={(e) =>
                      setPagamento((prev) => ({
                        ...prev,
                        taxa_servico_percentual: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-row-inline">
                  <label className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={pagamento.aplicar_taxa}
                      onChange={(e) =>
                        setPagamento((prev) => ({
                          ...prev,
                          aplicar_taxa: e.target.checked,
                        }))
                      }
                    />
                    Aplicar taxa de serviço às parcelas
                  </label>
                </div>
              </>
            )}
          </div>
        </section>

        <div className="form-actions form-actions-right">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/orcamentos')}
            disabled={saving}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar orçamento'}
          </button>
        </div>
      </form>
    </>
  )
}
