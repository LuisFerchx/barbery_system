import clsx from 'clsx'
import { ReactNode } from 'react'

interface Props {
  title: string
  value: string | number
  icon: ReactNode
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'purple'
  subtitle?: string
}

const colors = {
  green: 'bg-green-50 text-green-600',
  blue: 'bg-blue-50 text-blue-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
}

export default function StatCard({ title, value, icon, color = 'blue', subtitle }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <div className={clsx('p-2 rounded-lg', colors[color])}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}
