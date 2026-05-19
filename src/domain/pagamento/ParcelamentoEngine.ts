import {
  calcularParcelasCredito,
  calcularParcelasBoleto,
  gerarVencimentosBoleto,
  formatarDataBR,
  formatarIntervaloLabel,
  type ParcelaCredito,
  type ParcelaBoleto,
} from '../orcamento/parcelamento'
import {
  calcularResumoFinanciamento,
  type PagamentoFinanciamentoInput,
  type PagamentoFinanciamentoResumo,
} from '../orcamento/calculos'

export type { ParcelaCredito, ParcelaBoleto, PagamentoFinanciamentoInput, PagamentoFinanciamentoResumo }

export class ParcelamentoEngine {
  static calcularCredito(total: number, numParcelas: number): ParcelaCredito[] {
    return calcularParcelasCredito(total, numParcelas)
  }

  static calcularBoleto(total: number, datas: string[]): ParcelaBoleto[] {
    return calcularParcelasBoleto(total, datas)
  }

  static gerarVencimentos(primVencimento: string, intervaloDias: number, numParcelas: number): string[] {
    return gerarVencimentosBoleto(primVencimento, intervaloDias, numParcelas)
  }

  static calcularFinanciamento(input: PagamentoFinanciamentoInput): PagamentoFinanciamentoResumo {
    return calcularResumoFinanciamento(input)
  }

  static formatarData(isoDate: string): string {
    return formatarDataBR(isoDate)
  }

  static formatarIntervalo(intervaloDias: number, numParcelas: number): string {
    return formatarIntervaloLabel(intervaloDias, numParcelas)
  }
}
