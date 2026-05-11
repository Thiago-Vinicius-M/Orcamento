import type { ReactNode } from 'react'

export type Column<T> = {
  header: string
  accessor: (row: T) => ReactNode
  /** Fixed narrow width (e.g. actions column). Maps to style={{ width: '1%' }} */
  shrink?: boolean
}

type DataTableProps<T> = {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
}

export function DataTable<T>({ columns, data, rowKey }: DataTableProps<T>) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} scope="col" style={col.shrink ? { width: '1%' } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col, i) => (
                <td key={i}>{col.accessor(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
