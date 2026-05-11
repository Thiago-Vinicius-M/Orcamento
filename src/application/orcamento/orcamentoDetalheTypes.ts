import type { OrcamentoStatus } from '../../domain/orcamento/status'

export type OrcamentoDetalhe = {
  id: string
  cliente_nome: string
  status: OrcamentoStatus
  validade_ate: string
  subtotal: number
  desconto_total: number
  total: number
  created_at: string
  created_by_user_id: string | null
  created_by_name: string | null
  gerado_por_nome: string
}

export type OrcamentoItemDetalhe = {
  id: string
  produto_codigo: string
  produto_nome: string
  quantidade: number
  preco_unitario: number
  subtotal: number
}

export type OrcamentoPagamentoDetalhe = {
  tipo: string
  valor_entrada: number | null
  num_parcelas: number | null
  taxa_servico_percentual: number | null
  aplicar_taxa: boolean
}

export type OrcamentoDetalheResult = {
  orcamento: OrcamentoDetalhe | null
  itens: OrcamentoItemDetalhe[]
  pagamento: OrcamentoPagamentoDetalhe | null
}
