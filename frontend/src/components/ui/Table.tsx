import { ReactNode } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Column<T = any> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props<T = any> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  keyField?: keyof T
  emptyText?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Table<T extends Record<string, any>>({
  columns, data, loading, keyField = 'id' as keyof T, emptyText = 'Sin datos'
}: Props<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="animate-spin rounded-full h-7 w-7 border-2 border-transparent"
          style={{ borderTopColor: 'var(--gold-500)', borderRightColor: 'rgba(200,134,14,0.3)' }}
        />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-dark">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className={col.className}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                {emptyText}
              </td>
            </tr>
          ) : data.map((row, i) => (
            <tr key={String(row[keyField] ?? i)}>
              {columns.map(col => (
                <td key={col.key} className={col.className}>
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
