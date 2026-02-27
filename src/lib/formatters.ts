export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(date)
}

export function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }
  return digits.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    "$1.$2.$3/$4-$5",
  )
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  }
  return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "")
  return digits.replace(/(\d{5})(\d{3})/, "$1-$2")
}

export const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  financiamento: "Financiamento",
}

export const STATUS_ORCAMENTO_LABELS: Record<string, string> = {
  vigente: "Vigente",
  expirado: "Expirado",
  aprovado: "Aprovado",
  cancelado: "Cancelado",
}
