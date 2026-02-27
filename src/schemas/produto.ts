import { z } from "zod/v4"

export const produtoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  descricao: z.string(),
  preco: z.number().positive("Preço deve ser maior que zero"),
  codigoSku: z.string().min(1, "Código/SKU é obrigatório"),
  categoria: z.string().min(1, "Categoria é obrigatória"),
  imagem: z.string(),
  ativo: z.boolean(),
})

export type ProdutoFormData = z.infer<typeof produtoSchema>
