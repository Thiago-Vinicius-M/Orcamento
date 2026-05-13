import { useMemo } from 'react'
import { SearchableSelect } from '../../components'
import { formatCurrencyBRL } from '../../domain/financeiro/moeda'
import { parseDecimalInput } from '../../domain/financeiro/numero'
import { calcularSubtotalItem } from '../../domain/orcamento/calculos'
import type { OrcamentoNovoForm } from '../../hooks/useOrcamentoNovoForm'

/** Quantidade em unidades inteiras; decimais por peso/medida podem vir do cadastro de produto no futuro. */
function normalizarQuantidadeInteira(raw: string): string {
  const n = Math.max(0, Math.round(parseDecimalInput(raw)))
  return String(n)
}

type Props = Pick<
  OrcamentoNovoForm,
  | 'produtos'
  | 'itens'
  | 'loadingRefs'
  | 'desconto'
  | 'setDesconto'
  | 'totais'
  | 'descontoVendedorMensagem'
  | 'atualizarItem'
  | 'adicionarItem'
  | 'removerItem'
  | 'handleProdutoChange'
>

export function OrcamentoNovoItensEditor({
  produtos,
  itens,
  loadingRefs,
  desconto,
  setDesconto,
  totais,
  descontoVendedorMensagem,
  atualizarItem,
  adicionarItem,
  removerItem,
  handleProdutoChange,
}: Props) {
  const produtoOptions = useMemo(
    () =>
      produtos.map((p) => ({
        value: p.id,
        label: p.codigo ? `${p.codigo} - ${p.nome}` : p.nome,
        searchText: [p.codigo, p.nome].filter(Boolean).join(' '),
      })),
    [produtos],
  )

  return (
    <section className="card">
      <header className="card-header card-header-row">
        <h2>Itens do orçamento</h2>
        <button type="button" className="btn-secondary" onClick={adicionarItem} disabled={loadingRefs}>
          + Adicionar item
        </button>
      </header>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Produto</th>
              <th scope="col">Qtd.</th>
              <th scope="col">Preço unit.</th>
              <th scope="col">Subtotal (R$)</th>
              <th scope="col" style={{ width: '1%' }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, index) => {
              const qtd = parseDecimalInput(item.quantidade)
              const preco = parseDecimalInput(item.preco_unitario)
              const subtotal = calcularSubtotalItem(qtd, preco)
              const precoStr = item.preco_unitario.trim()
              const precoExibicao =
                precoStr === ''
                  ? item.produto_id === ''
                    ? 'Selecione o produto'
                    : '—'
                  : formatCurrencyBRL(preco)
              return (
                <tr key={index}>
                  <td className="table-cell-wrap">
                    <SearchableSelect
                      id={`orc_item_produto_${index}`}
                      ariaLabel={`Produto, item ${index + 1}`}
                      options={produtoOptions}
                      value={item.produto_id}
                      onValueChange={(id) => handleProdutoChange(index, id)}
                      disabled={loadingRefs}
                      required
                      emptySelectionLabel="Selecione"
                    />
                  </td>
                  <td>
                    <input
                      className="input-control"
                      type="number"
                      min="0"
                      step={1}
                      inputMode="numeric"
                      value={item.quantidade}
                      onChange={(e) => atualizarItem(index, { quantidade: e.target.value })}
                      onBlur={(e) =>
                        atualizarItem(index, {
                          quantidade: normalizarQuantidadeInteira(e.currentTarget.value),
                        })
                      }
                      required
                    />
                  </td>
                  <td>
                    <span className={precoStr === '' ? 'text-muted' : undefined}>{precoExibicao}</span>
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
                tipo: e.target.value as typeof desconto.tipo,
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
              onChange={(e) => setDesconto((prev) => ({ ...prev, valor: e.target.value }))}
              placeholder={desconto.tipo === 'percentual' ? 'Ex: 10' : 'Ex: 50.00'}
              aria-invalid={descontoVendedorMensagem != null}
              aria-describedby={descontoVendedorMensagem != null ? 'desc_teto_vendedor' : undefined}
            />
          </div>
        )}

        {descontoVendedorMensagem != null && (
          <div
            id="desc_teto_vendedor"
            className="form-error"
            role="alert"
            aria-live="assertive"
          >
            {descontoVendedorMensagem}
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
  )
}
