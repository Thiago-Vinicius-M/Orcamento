import { z } from "zod/v4"

export const lojaSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cnpj: z.string().min(14, "CNPJ inválido"),
  endereco: z.string().default(""),
  telefone: z.string().default(""),
  email: z.email("E-mail inválido").or(z.literal("")),
  logo: z.string().default(""),
})

export type LojaFormData = z.infer<typeof lojaSchema>
