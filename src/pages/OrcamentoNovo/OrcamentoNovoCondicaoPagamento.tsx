import type { PagamentoTipo } from '../../application/orcamento/orcamentoNovoService'
import type { OrcamentoNovoForm } from '../../hooks/useOrcamentoNovoForm'

type Props = Pick<OrcamentoNovoForm, 'pagamento' | 'setPagamento'>

export function OrcamentoNovoCondicaoPagamento({ pagamento, setPagamento }: Props) {
  return (
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
                onChange={(e) => setPagamento((prev) => ({ ...prev, valor_entrada: e.target.value }))}
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
                onChange={(e) => setPagamento((prev) => ({ ...prev, num_parcelas: e.target.value }))}
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
  )
}
