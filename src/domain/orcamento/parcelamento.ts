export const MAX_PARCELAS_CREDITO = 12

export type ParcelaCredito = { numero: number; valor: number }
export type ParcelaBoleto = { numero: number; data: string; valor: number }

/**
 * Divide `total` em `numParcelas` parcelas iguais.
 * A última parcela absorve centavos residuais para que a soma seja exata.
 */
export function calcularParcelasCredito(total: number, numParcelas: number): ParcelaCredito[] {
  if (numParcelas <= 0 || total <= 0) return []
  const valorBase = Math.floor((total / numParcelas) * 100) / 100
  const residuo = Math.round((total - valorBase * numParcelas) * 100) / 100
  return Array.from({ length: numParcelas }, (_, i) => ({
    numero: i + 1,
    valor: i === numParcelas - 1 ? Math.round((valorBase + residuo) * 100) / 100 : valorBase,
  }))
}

/**
 * Gera `numParcelas` datas ISO 'YYYY-MM-DD' a partir de `primVencimento`,
 * espaçadas por `intervaloDias`. Usa Date local (sem UTC) para evitar
 * problemas de fuso horário.
 */
export function gerarVencimentosBoleto(
  primVencimento: string,
  intervaloDias: number,
  numParcelas: number,
): string[] {
  if (!primVencimento || intervaloDias < 1 || numParcelas < 1) return []
  const parts = primVencimento.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return []
  const [ano, mes, dia] = parts
  return Array.from({ length: numParcelas }, (_, i) => {
    const d = new Date(ano, mes - 1, dia + intervaloDias * i)
    return isoLocal(d)
  })
}

/** Converte Date local em string 'YYYY-MM-DD' sem efeito de fuso horário. */
function isoLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Distribui `total` pelas `datas` com o mesmo arredondamento de crédito:
 * a última parcela absorve o residuo de centavos.
 */
export function calcularParcelasBoleto(total: number, datas: string[]): ParcelaBoleto[] {
  const n = datas.length
  if (n <= 0 || total <= 0) return []
  const valorBase = Math.floor((total / n) * 100) / 100
  const residuo = Math.round((total - valorBase * n) * 100) / 100
  return datas.map((data, i) => ({
    numero: i + 1,
    data,
    valor: i === n - 1 ? Math.round((valorBase + residuo) * 100) / 100 : valorBase,
  }))
}

/** Converte 'YYYY-MM-DD' em 'DD/MM/YYYY'. */
export function formatarDataBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Gera rótulo de intervalo no formato "7/14/21/28 dias".
 * Exemplo: intervaloDias=7, numParcelas=4 → "7/14/21/28 dias"
 */
export function formatarIntervaloLabel(intervaloDias: number, numParcelas: number): string {
  if (intervaloDias < 1 || numParcelas < 1) return ''
  const dias = Array.from({ length: numParcelas }, (_, i) => intervaloDias * (i + 1))
  return `${dias.join('/')} dias`
}
