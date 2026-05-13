import { describe, it, expect } from 'vitest'
import type { UserRole } from '@/types/userRole'
import type { OrcamentoStatus } from '../status'
import {
  podeAprovar,
  podeCancelar,
  podeExcluir,
  podeGerarPdf,
  podeReprovar,
} from '../status'

type Transicao =
  | 'aprovar_para_vigente'
  | 'reprovar_para_reprovado'
  | 'cancelar_para_cancelado'
  | 'excluir'
  | 'gerar_pdf'

const STATUS_TODOS: OrcamentoStatus[] = [
  'pendente',
  'vigente',
  'reprovado',
  'aprovado',
  'cancelado',
  'rascunho',
  'expirado',
]

const ROLES: (UserRole | null)[] = ['gerente', 'vendedor', null]

function transicaoPermitidaHoje(
  status: OrcamentoStatus,
  role: UserRole | null,
  t: Transicao,
): boolean {
  switch (t) {
    case 'aprovar_para_vigente':
      return podeAprovar(status, role)
    case 'reprovar_para_reprovado':
      return podeReprovar(status, role)
    case 'cancelar_para_cancelado':
      return podeCancelar(status, role)
    case 'excluir':
      return podeExcluir(status, role)
    case 'gerar_pdf':
      return podeGerarPdf(status)
    default: {
      const _exhaustive: never = t
      return _exhaustive
    }
  }
}

describe('FSM / permissões (caracterização do comportamento atual)', () => {
  it('aprovar: só pendente + gerente', () => {
    for (const status of STATUS_TODOS) {
      for (const role of ROLES) {
        const esperado = status === 'pendente' && role === 'gerente'
        expect(transicaoPermitidaHoje(status, role, 'aprovar_para_vigente')).toBe(esperado)
      }
    }
  })

  it('reprovar: só pendente + gerente', () => {
    for (const status of STATUS_TODOS) {
      for (const role of ROLES) {
        const esperado = status === 'pendente' && role === 'gerente'
        expect(transicaoPermitidaHoje(status, role, 'reprovar_para_reprovado')).toBe(esperado)
      }
    }
  })

  it('cancelar: pendente ou vigente (independente de role)', () => {
    for (const status of STATUS_TODOS) {
      for (const role of ROLES) {
        const esperado = status === 'pendente' || status === 'vigente'
        expect(transicaoPermitidaHoje(status, role, 'cancelar_para_cancelado')).toBe(esperado)
      }
    }
  })

  it('excluir: somente gerente, qualquer status', () => {
    for (const status of STATUS_TODOS) {
      for (const role of ROLES) {
        const esperado = role === 'gerente'
        expect(transicaoPermitidaHoje(status, role, 'excluir')).toBe(esperado)
      }
    }
  })

  it('gerar PDF: somente vigente (ignora role na função atual)', () => {
    for (const status of STATUS_TODOS) {
      for (const role of ROLES) {
        const esperado = status === 'vigente'
        expect(transicaoPermitidaHoje(status, role, 'gerar_pdf')).toBe(esperado)
      }
    }
  })

  it('cenários mencionados no plano: aprovado, expirado e rascunho não aprovam nem reprovam', () => {
    for (const status of ['aprovado', 'expirado', 'rascunho'] as const) {
      expect(podeAprovar(status, 'gerente')).toBe(false)
      expect(podeReprovar(status, 'gerente')).toBe(false)
    }
  })
})
