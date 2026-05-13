import { useMemo } from 'react'
import { SearchableSelect, type SearchableSelectOption } from '../../components'
import type { OrcamentoNovoForm } from '../../hooks/useOrcamentoNovoForm'

type Props = Pick<
  OrcamentoNovoForm,
  'clientes' | 'clienteId' | 'setClienteId' | 'loadingRefs'
>

export function OrcamentoNovoCabecalho({ clientes, clienteId, setClienteId, loadingRefs }: Props) {
  const clienteOptions = useMemo<SearchableSelectOption[]>(
    () =>
      clientes.map((c) => ({
        value: c.id,
        label: c.documento ? `${c.nome} — ${c.documento}` : c.nome,
        searchText: [c.nome, c.documento ?? ''].filter(Boolean).join(' '),
      })),
    [clientes],
  )

  return (
    <section className="card">
      <header className="card-header">
        <h2>Dados principais</h2>
      </header>

      <div className="form-grid">
        <SearchableSelect
          id="orc_cliente"
          label="Cliente *"
          options={clienteOptions}
          value={clienteId}
          onValueChange={setClienteId}
          disabled={loadingRefs}
          required
          emptySelectionLabel="Selecione um cliente"
        />

        <div className="form-row">
          <label>Validade</label>
          <input type="text" disabled value="30 dias a partir da data de criação" />
        </div>
      </div>
    </section>
  )
}
