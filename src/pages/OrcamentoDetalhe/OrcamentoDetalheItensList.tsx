import type { OrcamentoDetalhe, OrcamentoItemDetalhe } from '../../application/orcamento/orcamentoDetalheTypes'
import { EmptyState, DataTable, type Column } from '../../components'

type Props = {
  itens: OrcamentoItemDetalhe[]
  orcamento: OrcamentoDetalhe
}

const itensColumns: Column<OrcamentoItemDetalhe>[] = [
  {
    header: 'Produto',
    cellClassName: 'table-cell-wrap',
    accessor: (item) =>
      item.produto_codigo && item.produto_codigo !== '—'
        ? `${item.produto_codigo} - ${item.produto_nome}`
        : item.produto_nome,
  },
  { header: 'Qtd.', accessor: (item) => item.quantidade },
  { header: 'Preço unit. (R$)', accessor: (item) => `R$ ${item.preco_unitario.toFixed(2)}` },
  { header: 'Subtotal (R$)', accessor: (item) => `R$ ${item.subtotal.toFixed(2)}` },
]

export function OrcamentoDetalheItensList({ itens, orcamento }: Props) {
  return (
    <section className="card">
      <header className="card-header">
        <h2>Itens</h2>
      </header>
      {itens.length === 0 ? (
        <EmptyState message="Nenhum item cadastrado." />
      ) : (
        <DataTable columns={itensColumns} data={itens} rowKey={(item) => item.id} />
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
  )
}
