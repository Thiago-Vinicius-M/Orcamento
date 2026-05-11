import type { OrcamentoStatus } from '../../domain/orcamento/status'
import { findOrcamentoIdByNumeroPdf, loadOrcamentoDetalheRaw } from '../../repositories/orcamentoSupabaseRepository'
import type {
  OrcamentoDetalhe,
  OrcamentoDetalheResult,
  OrcamentoItemDetalhe,
  OrcamentoPagamentoDetalhe,
} from './orcamentoDetalheTypes'

function getClienteNome(row: Record<string, unknown>): string {
  const clientes = row.clientes

  if (Array.isArray(clientes)) {
    const nome = (clientes[0] as { nome?: unknown } | undefined)?.nome
    return typeof nome === 'string' && nome.trim() !== '' ? nome : '—'
  }

  const nome = (clientes as { nome?: unknown } | null | undefined)?.nome
  return typeof nome === 'string' && nome.trim() !== '' ? nome : '—'
}

function getCreatedByUserId(row: Record<string, unknown>): string | null {
  const value = row.created_by_user_id
  if (value === null || value === undefined) {
    return null
  }
  const text = String(value).trim()
  return text === '' ? null : text
}

function getCreatedByName(row: Record<string, unknown>): string | null {
  const value = row.created_by_name
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function mapOrcamento(row: Record<string, unknown>): OrcamentoDetalhe {
  const createdByUserId = getCreatedByUserId(row)
  const createdByName = getCreatedByName(row)

  return {
    id: String(row.id ?? ''),
    status: String(row.status ?? '') as OrcamentoStatus,
    validade_ate: String(row.validade_ate ?? ''),
    subtotal: Number(row.subtotal ?? 0),
    desconto_total: Number(row.desconto_total ?? 0),
    total: Number(row.total ?? 0),
    created_at: String(row.created_at ?? ''),
    cliente_nome: getClienteNome(row),
    created_by_user_id: createdByUserId,
    created_by_name: createdByName,
    gerado_por_nome: createdByName ?? '—',
  }
}

function mapItens(rows: Record<string, unknown>[]): OrcamentoItemDetalhe[] {
  return rows.map((row) => {
    const produtos = (row.produtos as { codigo?: unknown; nome?: unknown } | null | undefined) ?? {}

    return {
      id: String(row.id ?? ''),
      quantidade: Number(row.quantidade ?? 0),
      preco_unitario: Number(row.preco_unitario ?? 0),
      subtotal: Number(row.subtotal ?? 0),
      produto_codigo: typeof produtos.codigo === 'string' ? produtos.codigo : '—',
      produto_nome: typeof produtos.nome === 'string' ? produtos.nome : '—',
    }
  })
}

function mapPagamento(row: Record<string, unknown> | null): OrcamentoPagamentoDetalhe | null {
  if (!row) {
    return null
  }

  return {
    tipo: String(row.tipo ?? ''),
    valor_entrada: row.valor_entrada === null ? null : Number(row.valor_entrada ?? 0),
    num_parcelas: row.num_parcelas === null ? null : Number(row.num_parcelas ?? 0),
    taxa_servico_percentual:
      row.taxa_servico_percentual === null ? null : Number(row.taxa_servico_percentual ?? 0),
    aplicar_taxa: Boolean(row.aplicar_taxa),
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function resolverOrcamentoId(identificador: string): Promise<string | null> {
  const valor = identificador.trim()
  if (valor === '') {
    return null
  }
  if (isUuid(valor)) {
    return valor
  }
  return findOrcamentoIdByNumeroPdf(valor)
}

export async function carregarOrcamentoDetalhe(identificador: string): Promise<OrcamentoDetalheResult> {
  const orcamentoId = await resolverOrcamentoId(identificador)
  if (!orcamentoId) {
    return {
      orcamento: null,
      itens: [],
      pagamento: null,
    }
  }

  const { orcamento, itens, pagamento } = await loadOrcamentoDetalheRaw(orcamentoId)

  return {
    orcamento: orcamento ? mapOrcamento(orcamento) : null,
    itens: mapItens(itens),
    pagamento: mapPagamento(pagamento),
  }
}
