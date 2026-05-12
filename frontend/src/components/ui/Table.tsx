import { ReactNode } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Column<T = any> {
  key: string
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: T) => ReactNode
  className?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props<T = any> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  keyField?: keyof T
  emptyText?: string
  onRowClick?: (row: T) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions?: (row: T) => ReactNode
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Table<T extends Record<string, any>>({
  columns, data, loading, keyField = 'id' as keyof T,
  emptyText = 'Sin datos', onRowClick, actions,
}: Props<T>) {
  if (loading) {
    return (
      <div
        className="rounded-2xl flex items-center justify-center py-14"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}
      >
        <div
          className="animate-spin rounded-full h-7 w-7 border-2 border-transparent"
          style={{ borderTopColor: 'var(--gold-500)', borderRightColor: 'rgba(200,134,14,0.3)' }}
        />
      </div>
    )
  }

  return (
    <div
      className="overflow-x-auto rounded-2xl"
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--surface-border)',
        transition: 'border-color 0.2s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(200,134,14,0.2)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--surface-border)')}
    >
      <table className="table-dark">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className={col.className}>{col.label}</th>
            ))}
            {actions && <th style={{ width: 80 }} />}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                {emptyText}
              </td>
            </tr>
          ) : data.map((row, i) => (
            <tr
              key={String(row[keyField] ?? i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
              className={onRowClick ? 'hover:bg-white/5 transition-colors' : undefined}
            >
              {columns.map(col => (
                <td key={col.key} className={col.className}>
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                </td>
              ))}
              {actions && (
                <td onClick={e => e.stopPropagation()}>
                  {actions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
