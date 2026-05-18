import { useMemo } from 'react'
import { EmptyState, ProdutoItemModal } from '../../components'
import { formatCurrencyBRL } from '../../domain/financeiro/moeda'
import { parseDecimalInput } from '../../domain/financeiro/numero'
import { calcularSubtotalBrutoItem, calcularSubtotalItem } from '../../domain/orcamento/calculos'
import type { OrcamentoNovoForm } from '../../hooks/useOrcamentoNovoForm'

type Props = Pick<
  OrcamentoNovoForm,
  | 'produtos'
  | 'itens'
  | 'loadingRefs'
  | 'totais'
  | 'descontoVendedorMensagem'
  | 'tetoDescontoVendedor'
  | 'role'
  | 'modalAberto'
  | 'modalEditIndex'
  | 'abrirModalNovo'
  | 'abrirModalEditar'
  | 'fecharModal'
  | 'salvarItemModal'
  | 'removerItem'
>

export function OrcamentoNovoItensEditor({
  produtos,
  itens,
  loadingRefs,
  totais,
  descontoVendedorMensagem,
  tetoDescontoVendedor,
  role,
  modalAberto,
  modalEditIndex,
  abrirModalNovo,
  abrirModalEditar,
  fecharModal,
  salvarItemModal,
  removerItem,
}: Props) {
  const produtoMap = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos])

  const itensComputados = useMemo(
    () =>
      itens.map((item) => {
        const produto = produtoMap.get(item.produto_id)
        const qtd = parseDecimalInput(item.quantidade)
        const preco = parseDecimalInput(item.preco_unitario)
        const descPct = parseDecimalInput(item.desconto_percentual)
        const bruto = calcularSubtotalBrutoItem(qtd, preco)
        const liquido = calcularSubtotalItem(qtd, preco, descPct)
        return { item, produto, qtd, preco, descPct, bruto, liquido }
      }),
    [itens, produtoMap],
  )

  const dadosIniciais = modalEditIndex !== null ? itens[modalEditIndex] ?? null : null

  return (
    <section className="card">
      <header className="card-header card-header-row">
        <h2>Itens do orçamento</h2>
        <button
          type="button"
          className="btn-secondary"
          onClick={abrirModalNovo}
          disabled={loadingRefs}
        >
          + Adicionar item
        </button>
      </header>

      {itens.length === 0 ? (
        <EmptyState message='Nenhum item adicionado. Clique em "+ Adicionar item" para começar.' />
      ) : (
        <div className="items-list" style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {itensComputados.map(({ item, produto, qtd, preco, descPct, bruto, liquido }, index) => {
            const nomeProduto = produto
              ? (produto.codigo ? `${produto.codigo} - ${produto.nome}` : produto.nome)
              : item.produto_id

            return (
              <div key={index} className="item-card">
                <div className="item-card__info">
                  <div className="item-card__nome">{nomeProduto}</div>
                  <div className="item-card__meta">
                    {qtd} × {formatCurrencyBRL(preco)}
                    {descPct > 0 && (
                      <span style={{ marginLeft: '0.5rem', color: 'var(--accent-green, #166534)' }}>
                        — {descPct}% de desconto
                      </span>
                    )}
                  </div>
                </div>
                <div className="item-card__subtotal">
                  {descPct > 0 ? (
                    <span>
                      <span
                        style={{
                          textDecoration: 'line-through',
                          color: 'var(--text-muted, #6b7280)',
                          fontSize: '0.8rem',
                          marginRight: '0.35rem',
                        }}
                      >
                        {formatCurrencyBRL(bruto)}
                      </span>
                      {formatCurrencyBRL(liquido)}
                    </span>
                  ) : (
                    formatCurrencyBRL(liquido)
                  )}
                </div>
                <div className="item-card__actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                    onClick={() => abrirModalEditar(index)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-link-danger"
                    onClick={() => removerItem(index)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {descontoVendedorMensagem && (
        <div className="form-error" role="alert" aria-live="assertive" style={{ margin: '0.5rem 1rem' }}>
          {descontoVendedorMensagem}
        </div>
      )}

      <footer className="card-footer card-footer-right">
        <div className="totais-grid">
          <div>
            <span className="text-muted">Subtotal</span>
            <div>{formatCurrencyBRL(totais.subtotal)}</div>
          </div>
          <div>
            <span className="text-muted">Descontos</span>
            <div>{formatCurrencyBRL(totais.desconto_total)}</div>
          </div>
          <div>
            <span className="text-muted">Total</span>
            <div className="totais-total">{formatCurrencyBRL(totais.total)}</div>
          </div>
        </div>
      </footer>

      <ProdutoItemModal
        aberto={modalAberto}
        editIndex={modalEditIndex}
        dadosIniciais={dadosIniciais}
        produtos={produtos}
        loadingProdutos={loadingRefs}
        tetoDesconto={tetoDescontoVendedor}
        role={role}
        onConfirmar={salvarItemModal}
        onFechar={fecharModal}
      />
    </section>
  )
}
