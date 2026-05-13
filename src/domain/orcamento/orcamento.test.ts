import { describe, it, expect } from 'vitest'
import { Orcamento } from './orcamento'
import { OrcamentoTransitionError } from './orcamentoErrors'
import { orcamentoStateMachine } from './status'

describe('Orcamento (entidade)', () => {
  it('aprovar retorna vigente quando pendente e gerente', () => {
    const o = new Orcamento({ id: 'x', status: 'pendente' })
    expect(o.aprovar('gerente')).toBe('vigente')
  })

  it('aprovar lança quando sem permissão', () => {
    const o = new Orcamento({ id: 'x', status: 'pendente' })
    expect(() => o.aprovar('vendedor')).toThrow(OrcamentoTransitionError)
  })

  it('excluir não lança para gerente', () => {
    const o = new Orcamento({ id: 'x', status: 'aprovado' })
    expect(() => o.excluir('gerente')).not.toThrow()
  })
})

describe('orcamentoStateMachine.proximoStatus', () => {
  it('aprovar a partir de pendente → vigente', () => {
    expect(orcamentoStateMachine.proximoStatus('aprovar', 'pendente')).toBe('vigente')
  })

  it('cancelar a partir de vigente → cancelado', () => {
    expect(orcamentoStateMachine.proximoStatus('cancelar', 'vigente')).toBe('cancelado')
  })

  it('excluir não altera status na máquina', () => {
    expect(orcamentoStateMachine.proximoStatus('excluir', 'pendente')).toBeNull()
  })
})
