import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  icon: ReactNode
  color?: 'gold' | 'green' | 'blue' | 'red' | 'purple'
  subtitle?: string
  trend?: number // positive = up, negative = down
}

const iconColors: Record<NonNullable<Props['color']>, string> = {
  gold:   'rgba(200,134,14,0.15)',
  green:  'rgba(34,197,94,0.1)',
  blue:   'rgba(59,130,246,0.1)',
  red:    'rgba(239,68,68,0.1)',
  purple: 'rgba(168,85,247,0.1)',
}

const textColors: Record<NonNullable<Props['color']>, string> = {
  gold:   '#E4A225',
  green:  '#4ade80',
  blue:   '#60a5fa',
  red:    '#f87171',
  purple: '#c084fc',
}

export default function StatCard({ title, value, icon, color = 'gold', subtitle, trend }: Props) {
  const iconBg = iconColors[color]
  const iconColor = textColors[color]

  const TrendIcon = trend === undefined ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor = trend === undefined ? '' : trend > 0 ? '#4ade80' : trend < 0 ? '#f87171' : '#8a8680'

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <p className="stat-label">{title}</p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>

      <p className="stat-value mb-1">{value}</p>

      <div className="flex items-center gap-2 mt-2">
        {subtitle && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
        {TrendIcon && trend !== undefined && (
          <div className="flex items-center gap-1" style={{ color: trendColor }}>
            <TrendIcon size={12} />
            <span className="text-xs font-medium">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}
