import { useMemo } from 'react'
import type { PagamentoTipo } from '../../domain/orcamento/pagamento'
import {
  MAX_PARCELAS_CREDITO,
  calcularParcelasCredito,
  calcularParcelasBoleto,
  gerarVencimentosBoleto,
  formatarDataBR,
  formatarIntervaloLabel,
} from '../../domain/orcamento/parcelamento'
import { formatCurrencyBRL } from '../../domain/financeiro/moeda'
import type { OrcamentoNovoForm } from '../../hooks/useOrcamentoNovoForm'

type Props = Pick<OrcamentoNovoForm, 'pagamento' | 'setPagamento' | 'totais'>

function resetarCamposExtras(prev: OrcamentoNovoForm['pagamento'], novoTipo: PagamentoTipo) {
  return {
    ...prev,
    tipo: novoTipo,
    valor_entrada: '',
    num_parcelas: '',
    taxa_servico_percentual: '',
    aplicar_taxa: false,
    primeiro_vencimento: '',
    intervalo_dias: '',
  }
}

export function OrcamentoNovoCondicaoPagamento({ pagamento, setPagamento, totais }: Props) {
  const numParcelasCredito = parseInt(pagamento.num_parcelas, 10) || 0
  const numParcelasBoleto = parseInt(pagamento.num_parcelas, 10) || 0
  const intervaloDias = parseInt(pagamento.intervalo_dias, 10) || 0

  const parcelasCredito = useMemo(() => {
    if (pagamento.tipo !== 'credito' || numParcelasCredito < 1 || totais.total <= 0) return []
    return calcularParcelasCredito(totais.total, numParcelasCredito)
  }, [pagamento.tipo, numParcelasCredito, totais.total])

  const datasVencimentoBoleto = useMemo(() => {
    if (
      pagamento.tipo !== 'boleto' ||
      !pagamento.primeiro_vencimento ||
      intervaloDias < 1 ||
      numParcelasBoleto < 1
    )
      return []
    return gerarVencimentosBoleto(pagamento.primeiro_vencimento, intervaloDias, numParcelasBoleto)
  }, [pagamento.tipo, pagamento.primeiro_vencimento, intervaloDias, numParcelasBoleto])

  const parcelasBoleto = useMemo(() => {
    if (datasVencimentoBoleto.length === 0 || totais.total <= 0) return []
    return calcularParcelasBoleto(totais.total, datasVencimentoBoleto)
  }, [datasVencimentoBoleto, totais.total])

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
              setPagamento((prev) => resetarCamposExtras(prev, e.target.value as PagamentoTipo))
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

        {/* ── Crédito ── */}
        {pagamento.tipo === 'credito' && (
          <>
            <div className="form-row">
              <label htmlFor="pag_num_parcelas_credito">Quantidade de parcelas</label>
              <select
                id="pag_num_parcelas_credito"
                value={pagamento.num_parcelas}
                onChange={(e) => setPagamento((prev) => ({ ...prev, num_parcelas: e.target.value }))}
              >
                <option value="">Selecione</option>
                {Array.from({ length: MAX_PARCELAS_CREDITO }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={String(n)}>
                    {n}x
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row" style={{ gridColumn: '1 / -1' }}>
              <div className="payment-info-banner" role="note">
                <span aria-hidden="true">ℹ</span>
                <span>
                  Valores podem sofrer alteração devido a juros da credenciadora de cartão.
                </span>
              </div>
            </div>

            {parcelasCredito.length > 0 && (
              <div className="form-row" style={{ gridColumn: '1 / -1' }}>
                <div className="parcelas-preview">
                  <div className="parcelas-preview__header">Previsão de parcelas</div>
                  {parcelasCredito.map((p) => (
                    <div
                      key={p.numero}
                      className={`parcelas-preview__item${p.numero === parcelasCredito.length ? ' parcelas-preview__item--destaque' : ''}`}
                    >
                      <span>{p.numero}ª parcela</span>
                      <span>{formatCurrencyBRL(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Boleto ── */}
        {pagamento.tipo === 'boleto' && (
          <>
            <div className="form-row">
              <label htmlFor="pag_primeiro_vencimento">Data do 1º vencimento</label>
              <input
                id="pag_primeiro_vencimento"
                type="date"
                value={pagamento.primeiro_vencimento}
                onChange={(e) =>
                  setPagamento((prev) => ({ ...prev, primeiro_vencimento: e.target.value }))
                }
              />
            </div>

            <div className="form-row">
              <label htmlFor="pag_intervalo_dias">Intervalo (dias)</label>
              <input
                id="pag_intervalo_dias"
                type="number"
                min="1"
                step="1"
                placeholder="Ex: 7"
                value={pagamento.intervalo_dias}
                onChange={(e) =>
                  setPagamento((prev) => ({ ...prev, intervalo_dias: e.target.value }))
                }
              />
            </div>

            <div className="form-row">
              <label htmlFor="pag_num_parcelas_boleto">Quantidade de parcelas</label>
              <input
                id="pag_num_parcelas_boleto"
                type="number"
                min="1"
                step="1"
                placeholder="Ex: 4"
                value={pagamento.num_parcelas}
                onChange={(e) =>
                  setPagamento((prev) => ({ ...prev, num_parcelas: e.target.value }))
                }
              />
            </div>

            {parcelasBoleto.length > 0 && (
              <div className="form-row" style={{ gridColumn: '1 / -1' }}>
                <div className="parcelas-preview">
                  <div className="parcelas-preview__header">
                    Calendário de vencimentos
                    {intervaloDias > 0 && numParcelasBoleto > 0 && (
                      <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: 'var(--text-muted)' }}>
                        — {formatarIntervaloLabel(intervaloDias, numParcelasBoleto)}
                      </span>
                    )}
                  </div>
                  {parcelasBoleto.map((p) => (
                    <div
                      key={p.numero}
                      className={`parcelas-preview__item${p.numero === parcelasBoleto.length ? ' parcelas-preview__item--destaque' : ''}`}
                    >
                      <span>
                        {p.numero}º boleto — {formatarDataBR(p.data)}
                      </span>
                      <span>{formatCurrencyBRL(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Financiamento ── */}
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
