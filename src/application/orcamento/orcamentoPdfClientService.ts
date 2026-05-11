import { z } from 'zod'

import { isOrcamentoStatus } from '../../domain/orcamento/status'
import { gerarPdfOrcamento } from '../../pdf/orcamentoPdf'
import {
  loadOrcamentoPdfData,
  type OrcamentoPdfDataRaw,
} from '../../repositories/orcamentoSupabaseRepository'
import { OrcamentoSchema, type Orcamento } from '../../types/orcamento'

const pagamentoTipoSchema = z.enum(['dinheiro', 'debito', 'credito', 'pix', 'boleto', 'financiamento'])

function optionalEmail(value: string | null | undefined): string | undefined {
  if (value == null || String(value).trim() === '') {
    return undefined
  }
  const trimmed = String(value).trim()
  const result = z.string().email().safeParse(trimmed)
  return result.success ? result.data : undefined
}

function idCurtoParaArquivo(id: string): string {
  return id.replace(/-/g, '').slice(0, 8)
}

function dataHojeYYYYMMDD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function baixarBlobPdf(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.rel = 'noopener'
  a.click()
  URL.revokeObjectURL(url)
}

function mapPdfRawToOrcamento(raw: OrcamentoPdfDataRaw): Orcamento {
  const { orcamento, empresa, cliente, itens, pagamento } = raw

  if (itens.length === 0) {
    throw new Error('O orçamento não possui itens para gerar o PDF.')
  }

  if (!pagamento) {
    throw new Error('Dados de pagamento não encontrados para o orçamento.')
  }

  const statusStr = orcamento.status.trim()
  if (!isOrcamentoStatus(statusStr)) {
    throw new Error(`Status do orçamento inválido para o PDF: ${orcamento.status}`)
  }

  const tipoPagamento = pagamentoTipoSchema.safeParse(pagamento.tipo)
  if (!tipoPagamento.success) {
    throw new Error(`Tipo de pagamento inválido: ${pagamento.tipo}`)
  }

  const criadoEm = orcamento.created_at.trim()
  if (criadoEm === '') {
    throw new Error('Data de criação do orçamento ausente.')
  }

  return {
    id: orcamento.id,
    company_id: orcamento.company_id || undefined,
    numero: orcamento.numero_pdf ?? undefined,
    status: statusStr,
    criado_em: criadoEm,
    validade_ate: String(orcamento.validade_ate ?? ''),
    subtotal: orcamento.subtotal,
    descontos: orcamento.desconto_total,
    total: orcamento.total,
    empresa: {
      nome: empresa.razao_social.trim() || '—',
      documento: empresa.cnpj?.trim() || undefined,
      email: optionalEmail(empresa.email_contato),
      telefone: empresa.telefone_contato?.trim() || undefined,
      endereco: empresa.endereco?.trim() || undefined,
    },
    cliente: {
      nome: cliente.nome.trim() || '—',
      documento: cliente.documento?.trim() || undefined,
      email: optionalEmail(cliente.email),
      telefone: cliente.telefone?.trim() || undefined,
      endereco: cliente.endereco?.trim() || undefined,
    },
    itens: itens.map((item) => ({
      id: item.id,
      produto_id: item.produto_id || undefined,
      nome_produto: item.produto_nome.trim() || '—',
      descricao_produto: undefined,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      subtotal: item.subtotal,
    })) as Orcamento['itens'],
    pagamento: {
      tipo: tipoPagamento.data,
      valor_entrada: pagamento.valor_entrada ?? undefined,
      num_parcelas: pagamento.num_parcelas ?? undefined,
      taxa_servico_percentual: pagamento.taxa_servico_percentual ?? undefined,
      aplicar_taxa: pagamento.aplicar_taxa,
    },
    observacoes: undefined,
    gerado_por_nome: (() => {
      const n = orcamento.created_by_name?.trim()
      return n && n.length > 0 ? n : undefined
    })(),
  }
}

function parseOrcamentoComFeedback(obj: Orcamento): Orcamento {
  const result = OrcamentoSchema.safeParse(obj)
  if (!result.success) {
    const detalhe = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Dados do orçamento inválidos para o PDF. ${detalhe}`)
  }
  return result.data
}

/**
 * Carrega dados do Supabase, valida como `Orcamento`, gera o PDF no cliente e dispara o download.
 */
export async function gerarEBaixarPdfOrcamento(orcamentoId: string): Promise<void> {
  let dadosRaw: OrcamentoPdfDataRaw
  try {
    dadosRaw = await loadOrcamentoPdfData(orcamentoId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(msg === '' ? 'Não foi possível carregar o orçamento.' : msg)
  }

  const mapeado = mapPdfRawToOrcamento(dadosRaw)
  const orcamento = parseOrcamentoComFeedback(mapeado)

  let bytes: Uint8Array
  try {
    bytes = await gerarPdfOrcamento(orcamento)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(msg === '' ? 'Falha ao gerar o PDF.' : `Falha ao gerar o PDF: ${msg}`)
  }

  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
  const nomeArquivo = `orcamento_${idCurtoParaArquivo(orcamento.id)}_${dataHojeYYYYMMDD()}.pdf`
  baixarBlobPdf(blob, nomeArquivo)
}
