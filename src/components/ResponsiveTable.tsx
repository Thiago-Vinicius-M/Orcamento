import type { ReactNode } from 'react'
import { DataTable } from './DataTable'
import type { Column } from './DataTable'

export type MobileCardField<T> = {
  label: string
  value: (row: T) => ReactNode
  /** Ocupa as 2 colunas do grid. Default: false */
  fullWidth?: boolean
}

export type MobileCardConfig<T> = {
  /** Texto principal do card */
  title: (row: T) => ReactNode
  /** Badge (ex: StatusPill) — topo direito */
  badge?: (row: T) => ReactNode
  /** Linha secundária abaixo do título */
  meta?: (row: T) => ReactNode
  /** Campos label + valor no corpo do card */
  fields: MobileCardField<T>[]
  /** Botões de ação no rodapé do card */
  actions?: (row: T) => ReactNode
}

type Props<T> = {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  mobileCard: MobileCardConfig<T>
}

export function ResponsiveTable<T>({ columns, data, rowKey, mobileCard }: Props<T>) {
  return (
    <>
      <div className="responsive-table__desktop">
        <DataTable columns={columns} data={data} rowKey={rowKey} />
      </div>

      <ul className="responsive-table__mobile" role="list" aria-label="Lista de itens">
        {data.map((row) => (
          <li key={rowKey(row)} className="card mobile-card">
            <div className="mobile-card__header">
              <div>
                <div className="mobile-card__title">{mobileCard.title(row)}</div>
                {mobileCard.meta && (
                  <div className="mobile-card__meta">{mobileCard.meta(row)}</div>
                )}
              </div>
              {mobileCard.badge && mobileCard.badge(row)}
            </div>

            <div className="mobile-card__body">
              {mobileCard.fields.map((field, i) => (
                <div
                  key={i}
                  className={`mobile-card__field${field.fullWidth ? ' mobile-card__field--full' : ''}`}
                >
                  <div className="mobile-card__label">{field.label}</div>
                  <div className="mobile-card__value">{field.value(row)}</div>
                </div>
              ))}
            </div>

            {mobileCard.actions && (
              <div className="mobile-card__actions">{mobileCard.actions(row)}</div>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
