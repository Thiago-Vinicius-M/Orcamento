export interface Loja {
  id?: number
  nome: string
  cnpj: string
  endereco: string
  telefone: string
  email: string
  logo?: string
  updatedAt: Date
}

export interface Cliente {
  id?: number
  nome: string
  cpfCnpj: string
  telefone: string
  email: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  createdAt: Date
  updatedAt: Date
}

export interface Produto {
  id?: number
  nome: string
  descricao: string
  preco: number
  codigoSku: string
  categoria: string
  imagem?: string
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

export type StatusOrcamento = "vigente" | "expirado" | "aprovado" | "cancelado"

export interface Orcamento {
  id?: number
  numero: number
  clienteId: number
  dataEmissao: Date
  dataValidade: Date
  subtotal: number
  descontoValor: number
  descontoPercentual: number
  total: number
  status: StatusOrcamento
  observacoes: string
  createdAt: Date
  updatedAt: Date
}

export type FormaPagamento =
  | "dinheiro"
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "financiamento"

export interface ItemOrcamento {
  id?: number
  orcamentoId: number
  produtoId: number
  quantidade: number
  precoUnitario: number
  subtotal: number
}

export interface CondicaoPagamento {
  id?: number
  orcamentoId: number
  formaPagamento: FormaPagamento
  parcelas: number
  valorParcela: number
  valorTotal: number
  descontoPercentual: number
  observacoes: string
}
