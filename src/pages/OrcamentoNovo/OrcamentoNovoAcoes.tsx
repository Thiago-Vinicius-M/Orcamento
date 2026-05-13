import type { OrcamentoNovoForm } from '../../hooks/useOrcamentoNovoForm'

type Props = Pick<OrcamentoNovoForm, 'saving' | 'submitDisabled' | 'navigate'>

export function OrcamentoNovoAcoes({ saving, submitDisabled, navigate }: Props) {
  return (
    <div className="form-actions form-actions-right">
      <button type="button" className="btn-secondary" onClick={() => navigate('/orcamentos')} disabled={saving}>
        Cancelar
      </button>
      <button type="submit" className="btn-primary" disabled={submitDisabled}>
        {saving ? 'Salvando...' : 'Salvar orçamento'}
      </button>
    </div>
  )
}
