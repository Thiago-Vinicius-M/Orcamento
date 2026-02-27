import { z } from "zod/v4"

export const clienteSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpfCnpj: z.string().min(11, "CPF/CNPJ inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  email: z.email("E-mail inválido").or(z.literal("")),
  logradouro: z.string(),
  numero: z.string(),
  complemento: z.string(),
  bairro: z.string(),
  cidade: z.string(),
  estado: z.string(),
  cep: z.string(),
})

export type ClienteFormData = z.infer<typeof clienteSchema>
