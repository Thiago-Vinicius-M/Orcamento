import { describe, it, expect } from 'vitest'
import {
  isOrcamentoStatus,
  formatarStatusOrcamento,
  getStatusPillClassName,
  podeAprovar,
  podeReprovar,
  podeCancelar,
  podeExcluir,
  podeGerarPdf,
} from './status'
import type { OrcamentoStatus } from './status'

describe('isOrcamentoStatus', () => {
  const validStatuses = [
    'pendente',
    'vigente',
    'reprovado',
    'aprovado',
    'cancelado',
    'rascunho',
    'expirado',
  ]

  it.each(validStatuses)('returns true for "%s"', (status) => {
    expect(isOrcamentoStatus(status)).toBe(true)
  })

  it('returns false for unknown string', () => {
    expect(isOrcamentoStatus('desconhecido')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isOrcamentoStatus(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isOrcamentoStatus(undefined)).toBe(false)
  })

  it('returns false for number', () => {
    expect(isOrcamentoStatus(42)).toBe(false)
  })
})

describe('formatarStatusOrcamento', () => {
  const cases: [OrcamentoStatus, string][] = [
    ['pendente', 'Pendente'],
    ['vigente', 'Vigente'],
    ['reprovado', 'Reprovado'],
    ['aprovado', 'Aprovado'],
    ['cancelado', 'Cancelado'],
    ['rascunho', 'Rascunho'],
    ['expirado', 'Expirado'],
  ]

  it.each(cases)('formats "%s" as "%s"', (status, expected) => {
    expect(formatarStatusOrcamento(status)).toBe(expected)
  })
})

describe('getStatusPillClassName', () => {
  it('returns "warning" for pendente', () => {
    expect(getStatusPillClassName('pendente')).toBe('warning')
  })

  it('returns "success" for vigente', () => {
    expect(getStatusPillClassName('vigente')).toBe('success')
  })

  it('returns "danger" for reprovado', () => {
    expect(getStatusPillClassName('reprovado')).toBe('danger')
  })

  it('returns "success" for aprovado', () => {
    expect(getStatusPillClassName('aprovado')).toBe('success')
  })

  it('returns "muted" for cancelado', () => {
    expect(getStatusPillClassName('cancelado')).toBe('muted')
  })

  it('returns "muted" for rascunho', () => {
    expect(getStatusPillClassName('rascunho')).toBe('muted')
  })

  it('returns "muted" for expirado', () => {
    expect(getStatusPillClassName('expirado')).toBe('muted')
  })
})

describe('podeAprovar', () => {
  it('allows gerente to approve pendente', () => {
    expect(podeAprovar('pendente', 'gerente')).toBe(true)
  })

  it('denies vendedor from approving', () => {
    expect(podeAprovar('pendente', 'vendedor')).toBe(false)
  })

  it('denies approval for non-pendente status', () => {
    expect(podeAprovar('vigente', 'gerente')).toBe(false)
    expect(podeAprovar('aprovado', 'gerente')).toBe(false)
    expect(podeAprovar('cancelado', 'gerente')).toBe(false)
  })

  it('denies when role is null', () => {
    expect(podeAprovar('pendente', null)).toBe(false)
  })
})

describe('podeReprovar', () => {
  it('allows gerente to reject pendente', () => {
    expect(podeReprovar('pendente', 'gerente')).toBe(true)
  })

  it('denies vendedor from rejecting', () => {
    expect(podeReprovar('pendente', 'vendedor')).toBe(false)
  })

  it('denies rejection for non-pendente status', () => {
    expect(podeReprovar('vigente', 'gerente')).toBe(false)
    expect(podeReprovar('reprovado', 'gerente')).toBe(false)
  })

  it('denies when role is null', () => {
    expect(podeReprovar('pendente', null)).toBe(false)
  })
})

describe('podeCancelar', () => {
  it('allows cancelling pendente', () => {
    expect(podeCancelar('pendente', 'gerente')).toBe(true)
    expect(podeCancelar('pendente', 'vendedor')).toBe(true)
  })

  it('allows cancelling vigente', () => {
    expect(podeCancelar('vigente', 'gerente')).toBe(true)
    expect(podeCancelar('vigente', 'vendedor')).toBe(true)
  })

  it('denies cancelling other statuses', () => {
    expect(podeCancelar('aprovado', 'gerente')).toBe(false)
    expect(podeCancelar('reprovado', 'gerente')).toBe(false)
    expect(podeCancelar('cancelado', 'gerente')).toBe(false)
    expect(podeCancelar('expirado', 'gerente')).toBe(false)
  })

  it('allows cancelling even with null role', () => {
    expect(podeCancelar('pendente', null)).toBe(true)
  })
})

describe('podeGerarPdf', () => {
  it('returns true only for vigente', () => {
    expect(podeGerarPdf('vigente')).toBe(true)
  })

  it('returns false for all other statuses', () => {
    const outros: OrcamentoStatus[] = [
      'pendente',
      'reprovado',
      'aprovado',
      'cancelado',
      'rascunho',
      'expirado',
    ]
    for (const status of outros) {
      expect(podeGerarPdf(status)).toBe(false)
    }
  })
})

describe('podeExcluir', () => {
  it('allows gerente to delete any status', () => {
    expect(podeExcluir('pendente', 'gerente')).toBe(true)
    expect(podeExcluir('vigente', 'gerente')).toBe(true)
    expect(podeExcluir('aprovado', 'gerente')).toBe(true)
    expect(podeExcluir('cancelado', 'gerente')).toBe(true)
  })

  it('denies vendedor from deleting', () => {
    expect(podeExcluir('pendente', 'vendedor')).toBe(false)
    expect(podeExcluir('vigente', 'vendedor')).toBe(false)
  })

  it('denies when role is null', () => {
    expect(podeExcluir('pendente', null)).toBe(false)
  })
})
