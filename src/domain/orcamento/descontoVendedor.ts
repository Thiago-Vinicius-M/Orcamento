/**
 * Comparação do percentual efetivo de desconto sobre o subtotal com teto configurado.
 * Usa epsilon pequeno para absorver ruído de ponto flutuante após arredondamento em centavos.
 */
export const PERCENTUAL_DESCONTO_VENDEDOR_TETO_EPS = 1e-6

export function percentualDescontoEfetivoSobreSubtotal(subtotal: number, desconto_total: number): number {
  if (!(subtotal > 0)) {
    return 0
  }
  return (desconto_total / subtotal) * 100
}

/**
 * @param tetoPercentual teto em % (ex.: 7 = 7%). `null` = sem teto (nunca excede).
 */
export function descontoVendedorExcedeTeto(
  subtotal: number,
  desconto_total: number,
  tetoPercentual: number | null,
  eps: number = PERCENTUAL_DESCONTO_VENDEDOR_TETO_EPS,
): boolean {
  if (tetoPercentual === null) {
    return false
  }
  const efetivo = percentualDescontoEfetivoSobreSubtotal(subtotal, desconto_total)
  return efetivo > tetoPercentual + eps
}

/** Formata o teto para mensagem ao usuário (inteiro sem `.00`; decimais pt-BR até 2 casas). */
export function formatTetoPercentualParaMensagem(teto: number): string {
  if (Number.isInteger(teto)) {
    return String(teto)
  }
  return teto.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
}

/** Copy estável quando o desconto efetivo ultrapassa o teto configurado (cliente e `criarOrcamento`). */
export function mensagemValorMaximoDescontoVendedor(teto: number): string {
  return `Valor máximo de desconto: ${formatTetoPercentualParaMensagem(teto)}%`
}
