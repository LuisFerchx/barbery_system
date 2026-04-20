import { ReactNode } from 'react'
import clsx from 'clsx'

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
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map(col => (
              <th key={col.key} className={clsx('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-10 text-gray-400">{emptyText}</td>
            </tr>
          ) : data.map((row, i) => (
            <tr key={String(row[keyField] ?? i)} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              {columns.map(col => (
                <td key={col.key} className={clsx('px-4 py-3 text-gray-700', col.className)}>
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
