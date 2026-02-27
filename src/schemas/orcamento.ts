import { z } from "zod/v4"

export const itemOrcamentoSchema = z.object({
  produtoId: z.number().positive("Selecione um produto"),
  quantidade: z.number().int().positive("Quantidade deve ser maior que zero"),
  precoUnitario: z.number().positive("Preço deve ser maior que zero"),
})

export const condicaoPagamentoSchema = z.object({
  formaPagamento: z.enum([
    "dinheiro",
    "pix",
    "cartao_credito",
    "cartao_debito",
    "financiamento",
  ]),
  parcelas: z.number().int().positive("Número de parcelas inválido"),
  valorParcela: z.number().min(0).default(0),
  valorTotal: z.number().min(0).default(0),
  descontoPercentual: z.number().min(0).max(100).default(0),
  observacoes: z.string().optional().default(""),
})

export const orcamentoSchema = z.object({
  clienteId: z.number().positive("Selecione um cliente"),
  descontoValor: z.number().min(0).default(0),
  descontoPercentual: z.number().min(0).max(100).default(0),
  observacoes: z.string().optional().default(""),
  itens: z.array(itemOrcamentoSchema).min(1, "Adicione pelo menos um item"),
  condicoesPagamento: z
    .array(condicaoPagamentoSchema)
    .min(1, "Adicione pelo menos uma condição de pagamento"),
})

export type OrcamentoFormData = z.infer<typeof orcamentoSchema>
export type ItemOrcamentoFormData = z.infer<typeof itemOrcamentoSchema>
export type CondicaoPagamentoFormData = z.infer<
  typeof condicaoPagamentoSchema
>
