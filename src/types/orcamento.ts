import { z } from "zod";
import { PAYMENT_TYPES } from "../domain/pagamento/PaymentTypeRegistry";

export const OrcamentoItemSchema = z.object({
  id: z.string().optional(),
  produto_id: z.string().optional(),
  nome_produto: z.string(),
  descricao_produto: z.string().optional(),
  quantidade: z.number().positive(),
  preco_unitario: z.number().nonnegative(),
  subtotal: z.number().nonnegative()
});

export const OrcamentoPagamentoSchema = z.object({
  tipo: z.enum(PAYMENT_TYPES),
  valor_entrada: z.number().nonnegative().optional(),
  num_parcelas: z.number().int().positive().optional(),
  taxa_servico_percentual: z.number().nonnegative().optional(),
  aplicar_taxa: z.boolean().optional(),
  primeiro_vencimento: z.string().optional(),
  intervalo_dias: z.number().int().positive().optional(),
});

export const EmpresaSchema = z.object({
  nome: z.string(),
  documento: z.string().optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional()
});

export const ClienteSchema = z.object({
  nome: z.string(),
  documento: z.string().optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional()
});

export const OrcamentoSchema = z.object({
  id: z.string(),
  company_id: z.string().optional(),
  numero: z.string().optional(),
  status: z.enum(["pendente", "vigente", "reprovado", "aprovado", "cancelado", "rascunho", "expirado"]),
  criado_em: z.string(),
  validade_ate: z.string(),
  subtotal: z.number().nonnegative(),
  descontos: z.number().nonnegative().default(0),
  /** Onde o desconto incide (PDF e exibição). Ausente = tratado como no valor total. */
  desconto_aplicacao: z.enum(["itens", "total"]).optional(),
  total: z.number().nonnegative(),
  empresa: EmpresaSchema,
  cliente: ClienteSchema,
  itens: z.array(OrcamentoItemSchema).nonempty(),
  pagamento: OrcamentoPagamentoSchema,
  observacoes: z.string().optional(),
  /** Nome de quem gerou o documento (snapshot); omitido/nulo em payloads antigos ou sem perfil. */
  gerado_por_nome: z.string().nullish()
});

export type Orcamento = z.infer<typeof OrcamentoSchema>;
