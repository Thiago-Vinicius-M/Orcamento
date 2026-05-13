import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import type { Orcamento } from '@/types/orcamento'
import { OrcamentoSchema } from '@/types/orcamento'
import { apresentarOrcamentoPdf } from '../orcamentoPdfPresenter'
import { renderizarOrcamentoPdf } from '../orcamentoPdfRenderer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const baselineHashes = JSON.parse(
  readFileSync(path.join(__dirname, '../__snapshots__/orcamentoPdf.hash.json'), 'utf8'),
) as Record<string, string>

/** Garante embed das fontes TTF (mesmos bytes usados em runtime Node no font loader). */
async function assertRobotoFontsReadable() {
  const regular = path.resolve(__dirname, '../../assets/fonts/Roboto-Regular.ttf')
  const bold = path.resolve(__dirname, '../../assets/fonts/Roboto-Bold.ttf')
  const [r, b] = await Promise.all([readFile(regular), readFile(bold)])
  expect(r.byteLength).toBeGreaterThan(1000)
  expect(b.byteLength).toBeGreaterThan(1000)
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

const empresa = {
  nome: 'Empresa Fixtures LTDA',
  documento: '12.345.678/0001-90',
  email: 'contato@fixtures.example',
  telefone: '(11) 3000-0000',
  endereco: 'Av. Paulista, 1000 — São Paulo/SP',
}

const cliente = {
  nome: 'Cliente Caracterização',
  documento: '123.456.789-00',
  email: 'cliente@fixtures.example',
  telefone: '(11) 98888-7777',
  endereco: 'Rua das Flores, 42',
}

function baseOrcamento(partial: Partial<Orcamento>): Orcamento {
  const raw = {
    id: '00000000-0000-4000-8000-000000000001',
    company_id: '00000000-0000-4000-8000-000000000002',
    numero: '2024-099',
    status: 'vigente' as const,
    criado_em: '2024-01-15T15:00:00.000Z',
    validade_ate: '2024-02-20T15:00:00.000Z',
    subtotal: 2_000,
    descontos: 0,
    desconto_aplicacao: 'total' as const,
    total: 2_000,
    empresa,
    cliente,
    itens: [
      {
        nome_produto: 'Serviço de implantação',
        quantidade: 2,
        preco_unitario: 500,
        subtotal: 1_000,
      },
      {
        nome_produto: 'Licença anual',
        quantidade: 1,
        preco_unitario: 1_000,
        subtotal: 1_000,
      },
    ],
    pagamento: { tipo: 'dinheiro' as const },
    observacoes: 'Observação de teste para caracterização.',
    gerado_por_nome: 'Fulano da Silva',
    ...partial,
  }
  return OrcamentoSchema.parse(raw)
}

const casos = {
  financiamentoComTaxa: baseOrcamento({
    pagamento: {
      tipo: 'financiamento',
      valor_entrada: 400,
      num_parcelas: 8,
      taxa_servico_percentual: 3.25,
      aplicar_taxa: true,
    },
    subtotal: 2_000,
    total: 2_000,
    descontos: 0,
  }),

  aVistaDinheiro: baseOrcamento({
    pagamento: { tipo: 'dinheiro' },
  }),

  descontoPercentualNosItens: baseOrcamento({
    descontos: 200,
    desconto_aplicacao: 'itens',
    subtotal: 2_000,
    total: 1_800,
  }),

  descontoFixoNoTotal: baseOrcamento({
    descontos: 250,
    desconto_aplicacao: 'total',
    subtotal: 2_000,
    total: 1_750,
  }),

  semGeradoPorNumeroPdf: baseOrcamento({
    numero: undefined,
    gerado_por_nome: undefined,
  }),
} satisfies Record<string, Orcamento>

describe('orcamentoPdf caracterização (Fase 0)', () => {
  it('Roboto TTF fixtures estão disponíveis para PDF determinístico', async () => {
    await assertRobotoFontsReadable()
  })

  it.each(
    Object.entries(casos).map(([id, orcamento]) => ({ id, orcamento })),
  )('ViewModel snapshot $id', ({ id, orcamento }) => {
    const vm = apresentarOrcamentoPdf(orcamento)
    expect(vm).toMatchSnapshot(`viewModel-${id}`)
  })

  it.each(
    Object.entries(casos).map(([id, orcamento]) => ({ id, orcamento })),
  )('PDF bytes hash SHA-256 $id', async ({ id, orcamento }) => {
    const vm = apresentarOrcamentoPdf(orcamento)
    const bytes = await renderizarOrcamentoPdf(vm, { freezeDocumentDates: true })
    const hex = sha256Hex(bytes)
    expect(hex).toBe((baselineHashes as Record<string, string>)[id])
  })
})
