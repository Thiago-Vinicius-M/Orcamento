import type { OrcamentoDetalhe, OrcamentoItemDetalhe } from '../../application/orcamento/orcamentoDetalheTypes'
import { EmptyState, type Column, ResponsiveTable, type MobileCardConfig } from '../../components'
import { formatCurrencyBRL } from '../../domain/financeiro/moeda'
import { calcularSubtotalBrutoItem } from '../../domain/orcamento/calculos'

type Props = {
  itens: OrcamentoItemDetalhe[]
  orcamento: OrcamentoDetalhe
}

function buildColumns(comDesconto: boolean): Column<OrcamentoItemDetalhe>[] {
  const cols: Column<OrcamentoItemDetalhe>[] = [
    {
      header: 'Produto',
      cellClassName: 'table-cell-wrap',
      accessor: (item) =>
        item.produto_codigo && item.produto_codigo !== '—'
          ? `${item.produto_codigo} - ${item.produto_nome}`
          : item.produto_nome,
    },
    { header: 'Qtd.', accessor: (item) => item.quantidade },
    { header: 'Preço unit.', accessor: (item) => formatCurrencyBRL(item.preco_unitario) },
  ]

  if (comDesconto) {
    cols.push({
      header: 'Desc. (%)',
      accessor: (item) =>
        item.desconto_percentual > 0 ? `${item.desconto_percentual}%` : '—',
    })
  }

  cols.push({ header: 'Subtotal', accessor: (item) => formatCurrencyBRL(item.subtotal) })

  return cols
}

function buildMobileCard(comDesconto: boolean): MobileCardConfig<OrcamentoItemDetalhe> {
  return {
    title: (item) =>
      item.produto_codigo && item.produto_codigo !== '—'
        ? `${item.produto_codigo} — ${item.produto_nome}`
        : item.produto_nome,
    fields: [
      { label: 'Quantidade', value: (item) => String(item.quantidade) },
      { label: 'Preço unit.', value: (item) => formatCurrencyBRL(item.preco_unitario) },
      ...(comDesconto
        ? [
            {
              label: 'Desconto',
              value: (item: OrcamentoItemDetalhe) =>
                item.desconto_percentual > 0
                  ? `${item.desconto_percentual}% (− ${formatCurrencyBRL(
                      calcularSubtotalBrutoItem(item.quantidade, item.preco_unitario) - item.subtotal,
                    )})`
                  : '—',
            },
          ]
        : []),
      {
        label: 'Subtotal',
        value: (item) => formatCurrencyBRL(item.subtotal),
        fullWidth: true,
      },
    ],
  }
}

export function OrcamentoDetalheItensList({ itens, orcamento }: Props) {
  const comDesconto = itens.some((item) => item.desconto_percentual > 0)
  const columns = buildColumns(comDesconto)
  const mobileCard = buildMobileCard(comDesconto)

  return (
    <section className="card">
      <header className="card-header">
        <h2>Itens</h2>
      </header>
      {itens.length === 0 ? (
        <EmptyState message="Nenhum item cadastrado." />
      ) : (
        <ResponsiveTable
          columns={columns}
          data={itens}
          rowKey={(item) => item.id}
          mobileCard={mobileCard}
        />
      )}

      <footer className="card-footer card-footer-right">
        <div className="totais-grid">
          <div>
            <span className="text-muted">Subtotal</span>
            <div>{formatCurrencyBRL(orcamento.subtotal)}</div>
          </div>
          <div>
            <span className="text-muted">Descontos</span>
            <div>{formatCurrencyBRL(orcamento.desconto_total)}</div>
          </div>
          <div>
            <span className="text-muted">Total</span>
            <div className="totais-total">{formatCurrencyBRL(orcamento.total)}</div>
          </div>
        </div>
      </footer>
    </section>
  )
}
