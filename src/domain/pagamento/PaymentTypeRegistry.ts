/**
 * Fonte única de verdade para tipos de pagamento do sistema.
 *
 * Todo novo tipo de pagamento deve ser adicionado APENAS aqui.
 * Validações Zod, discriminated unions e options de formulário devem
 * importar deste módulo em vez de redefinir a lista.
 */

export const PAYMENT_TYPES = [
  'dinheiro',
  'debito',
  'credito',
  'pix',
  'boleto',
  'financiamento',
] as const;

export type PagamentoTipo = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_SIMPLE_TYPES = ['dinheiro', 'debito', 'pix'] as const;
export type PagamentoTipoSimples = (typeof PAYMENT_SIMPLE_TYPES)[number];

export const PAYMENT_TYPE_LABELS: Record<PagamentoTipo, string> = {
  dinheiro: 'À vista — Dinheiro',
  pix: 'À vista — Pix',
  debito: 'Débito',
  credito: 'Cartão de Crédito',
  boleto: 'Boleto Bancário',
  financiamento: 'Financiamento',
};

export function isPagamentoTipoSimples(value: string): value is PagamentoTipoSimples {
  return (PAYMENT_SIMPLE_TYPES as readonly string[]).includes(value);
}

export function isPagamentoTipo(value: string): value is PagamentoTipo {
  return (PAYMENT_TYPES as readonly string[]).includes(value);
}
