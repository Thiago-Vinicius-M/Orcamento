import { useMemo } from 'react'
import type { OrcamentoPagamentoDetalhe } from '../../application/orcamento/orcamentoDetalheTypes'
import {
  isPagamentoFinanciamento,
  isPagamentoCredito,
  isPagamentoBoleto,
  pagamentoFromDetalheRow,
} from '../../domain/orcamento/pagamento'
import {
  calcularParcelasCredito,
  calcularParcelasBoleto,
  gerarVencimentosBoleto,
  formatarDataBR,
} from '../../domain/orcamento/parcelamento'
import { calcularResumoFinanciamento } from '../../domain/orcamento/calculos'
import { formatCurrencyBRL } from '../../domain/financeiro/moeda'
import { EmptyState } from '../../components'

type Props = { pagamento: OrcamentoPagamentoDetalhe | null; total: number }

function SecaoHeader({ titulo }: { titulo: string }) {
  return (
    <div className="pag-secao-header">
      <h2 className="pag-secao-titulo">{titulo}</h2>
    </div>
  )
}

function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="pag-info-badge">
      <span className="pag-info-badge__label">{label}</span>
      <span className="pag-info-badge__value">{value}</span>
    </div>
  )
}

function ResumoBox({
  linhas,
  destaque,
}: {
  linhas: Array<{ label: string; value: string }>
  destaque: { label: string; value: string }
}) {
  return (
    <div className="pag-resumo-box">
      <div className="pag-resumo-box__titulo">Resumo do pagamento</div>
      {linhas.map((l) => (
        <div key={l.label} className="pag-resumo-box__linha">
          <span className="pag-resumo-box__linha-label">{l.label}</span>
          <span className="pag-resumo-box__linha-value">{l.value}</span>
        </div>
      ))}
      <div className="pag-resumo-box__destaque">
        <span className="pag-resumo-box__destaque-label">{destaque.label}</span>
        <span className="pag-resumo-box__destaque-value">{destaque.value}</span>
      </div>
    </div>
  )
}

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="payment-info-banner" role="note">
      <span className="payment-info-banner__indicator" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

export function OrcamentoDetalhePagamentoResumo({ pagamento, total }: Props) {
  const pagamentoModel = useMemo(
    () => (pagamento ? pagamentoFromDetalheRow(pagamento) : null),
    [pagamento],
  )

  const parcelasCredito = useMemo(() => {
    if (!pagamentoModel || !isPagamentoCredito(pagamentoModel)) return []
    const n = pagamentoModel.num_parcelas ?? 0
    if (n < 1 || total <= 0) return []
    return calcularParcelasCredito(total, n)
  }, [pagamentoModel, total])

  const parcelasBoleto = useMemo(() => {
    if (!pagamentoModel || !isPagamentoBoleto(pagamentoModel)) return []
    const { num_parcelas, primeiro_vencimento, intervalo_dias } = pagamentoModel
    if (!primeiro_vencimento || !intervalo_dias || !num_parcelas || total <= 0) return []
    const datas = gerarVencimentosBoleto(primeiro_vencimento, intervalo_dias, num_parcelas)
    return calcularParcelasBoleto(total, datas)
  }, [pagamentoModel, total])

  if (!pagamento || !pagamentoModel) {
    return (
      <section className="card">
        <header className="card-header"><h2>Condição de pagamento</h2></header>
        <EmptyState message="Condição de pagamento não cadastrada para este orçamento." />
      </section>
    )
  }

  // ── CRÉDITO ─────────────────────────────────────────────────────────────────
  if (isPagamentoCredito(pagamentoModel)) {
    const n = pagamentoModel.num_parcelas ?? 1
    const valorParcela = parcelasCredito[0]?.valor ?? total
    const resumoText = n <= 1 ? 'À vista' : `${n}x de ${formatCurrencyBRL(valorParcela)}`

    return (
      <section className="card pag-card">
        <SecaoHeader titulo="Cartão de Crédito" />

        <div className="pag-two-col pag-two-col--equal" style={{ paddingTop: '1.25rem' }}>
          <div>
            <div className="pag-label-small">Parcelamento</div>
            <div className="pag-valor-destaque">{resumoText}</div>
          </div>

          <ResumoBox
            linhas={[
              { label: 'Valor total', value: formatCurrencyBRL(total) },
              { label: 'Número de parcelas', value: String(n) },
              { label: 'Valor por parcela (estimado)', value: formatCurrencyBRL(valorParcela) },
            ]}
            destaque={{ label: 'Forma de cobrança', value: 'Cartão de Crédito' }}
          />
        </div>

        <div className="pag-footer">
          <InfoBanner>
            Valores podem sofrer alteração devido a juros da credenciadora de cartão.
          </InfoBanner>
        </div>
      </section>
    )
  }

  // ── BOLETO ──────────────────────────────────────────────────────────────────
  if (isPagamentoBoleto(pagamentoModel)) {
    const n = pagamentoModel.num_parcelas ?? 1
    const primVenc = pagamentoModel.primeiro_vencimento
    const intervalo = pagamentoModel.intervalo_dias
    const temDatas = !!(primVenc && intervalo && parcelasBoleto.length > 0)
    const valorParcela = parcelasBoleto[0]?.valor ?? (n > 0 ? total / n : total)

    return (
      <section className="card pag-card">
        <SecaoHeader titulo="Boleto Bancário" />

        {temDatas ? (
          <>
            <div className="pag-badges-row">
              <InfoBadge label="1º vencimento" value={formatarDataBR(primVenc!)} />
              <InfoBadge label="Intervalo" value={`${intervalo} dias`} />
              <InfoBadge label="Quantidade de parcelas" value={String(n)} />
              <InfoBadge label="Valor de cada parcela" value={formatCurrencyBRL(valorParcela)} />
            </div>

            <div className="pag-two-col">
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Parcela</th>
                      <th>Vencimento</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parcelasBoleto.map((p) => (
                      <tr key={p.numero}>
                        <td>{p.numero}ª parcela</td>
                        <td>{formatarDataBR(p.data)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {formatCurrencyBRL(p.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ResumoBox
                linhas={[
                  { label: 'Valor total', value: formatCurrencyBRL(total) },
                  { label: 'Quantidade de parcelas', value: String(n) },
                ]}
                destaque={{ label: 'Valor total da negociação', value: formatCurrencyBRL(total) }}
              />
            </div>
          </>
        ) : (
          <div className="pag-two-col pag-two-col--equal" style={{ paddingTop: '1.25rem' }}>
            <div>
              <div className="pag-label-small">Parcelamento</div>
              <div className="pag-valor-destaque">{n > 1 ? `${n}×` : 'À vista'}</div>
              <p className="pag-aviso-boleto">
                Datas de vencimento não configuradas. Para visualizar o calendário completo, edite o orçamento e preencha os campos de vencimento.
              </p>
            </div>
            <ResumoBox
              linhas={[
                { label: 'Valor total', value: formatCurrencyBRL(total) },
                { label: 'Quantidade de parcelas', value: String(n) },
              ]}
              destaque={{ label: 'Valor total da negociação', value: formatCurrencyBRL(total) }}
            />
          </div>
        )}

        <div className="pag-footer">
          <InfoBanner>
            As datas de vencimento são calculadas com base no intervalo informado. Em caso de feriados ou finais de semana, os boletos poderão ser ajustados automaticamente.
          </InfoBanner>
        </div>
      </section>
    )
  }

  // ── FINANCIAMENTO ────────────────────────────────────────────────────────────
  if (isPagamentoFinanciamento(pagamentoModel)) {
    const { entrada, valorFinanciado, parcelas, taxa, aplicarTaxa, valorParcela } =
      calcularResumoFinanciamento({
        total,
        valor_entrada: pagamentoModel.valor_entrada,
        num_parcelas: pagamentoModel.num_parcelas,
        taxa_servico_percentual: pagamentoModel.taxa_servico_percentual,
        aplicar_taxa: pagamentoModel.aplicar_taxa,
      })

    const taxaFmt = taxa.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 0 })

    return (
      <section className="card pag-card">
        <SecaoHeader titulo="Financiamento" />

        <div className="pag-badges-row">
          <InfoBadge label="Entrada" value={formatCurrencyBRL(entrada)} />
          <InfoBadge label="Valor financiado" value={formatCurrencyBRL(valorFinanciado)} />
          <InfoBadge label="Parcelas" value={`${parcelas}×`} />
          {aplicarTaxa && taxa > 0 && (
            <InfoBadge label="Taxa de serviço" value={`${taxaFmt}%`} />
          )}
        </div>

        <div className="pag-two-col pag-two-col--equal">
          <div>
            <div className="pag-label-small">Parcelamento</div>
            <div className="pag-valor-destaque">
              {parcelas}x de {formatCurrencyBRL(valorParcela)}
            </div>
          </div>

          <ResumoBox
            linhas={[
              { label: 'Valor total', value: formatCurrencyBRL(total) },
              { label: 'Entrada', value: formatCurrencyBRL(entrada) },
              { label: 'Valor financiado', value: formatCurrencyBRL(valorFinanciado) },
              ...(aplicarTaxa && taxa > 0
                ? [{ label: `Taxa de serviço (${taxaFmt}%)`, value: formatCurrencyBRL(valorFinanciado * (taxa / 100)) }]
                : []),
            ]}
            destaque={{ label: 'Valor total da negociação', value: formatCurrencyBRL(total) }}
          />
        </div>
      </section>
    )
  }

  // ── SIMPLES (dinheiro, pix, débito) ──────────────────────────────────────────
  const CONFIG: Record<string, { titulo: string; descricao: string }> = {
    dinheiro: { titulo: 'Dinheiro', descricao: 'Pagamento à vista em dinheiro' },
    pix:      { titulo: 'Pix',      descricao: 'Pagamento instantâneo via Pix' },
    debito:   { titulo: 'Débito',   descricao: 'Pagamento no débito' },
  }

  const cfg = CONFIG[pagamentoModel.tipo] ?? {
    titulo: pagamentoModel.tipo,
    descricao: 'Pagamento à vista',
  }

  return (
    <section className="pag-simples-section">
      <SecaoHeader titulo={cfg.titulo} />
      <div className="pag-simples-body">
        <span className="pag-simples-body__desc">{cfg.descricao}</span>
        <span className="pag-simples-body__valor">{formatCurrencyBRL(total)}</span>
      </div>
    </section>
  )
}
