import { useEffect, useState } from 'react'
import { DollarSign, Users, ShoppingCart, TrendingUp, AlertTriangle, ArrowRight, Scissors } from 'lucide-react'
import { Link } from 'react-router-dom'
import { accountingApi, inventoryApi, salesApi, barbersApi } from '../services/api'
import StatCard from '../components/ui/StatCard'
import { fmt } from '../utils/format'
import type { AccountingDashboard, InventoryItem, Barber } from '../types'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, subDays } from 'date-fns'

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="card-sm px-3 py-2 text-xs">
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-semibold mt-0.5" style={{ color: 'var(--gold-400)' }}>{fmt.money(payload[0].value)}</p>
    </div>
  )
}

export default function Dashboard() {
  const [accounting, setAccounting] = useState<AccountingDashboard | null>(null)
  const [lowStock, setLowStock] = useState<InventoryItem[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [dailyData, setDailyData] = useState<{ date: string; total: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const from = format(subDays(new Date(), 30), 'yyyy-MM-dd')

    Promise.all([
      accountingApi.dashboard({ date_from: from, date_to: today }),
      inventoryApi.lowStock(),
      barbersApi.list(),
    ]).then(([acc, stock, barb]) => {
      setAccounting(acc.data)
      setLowStock(stock.data)
      setBarbers(barb.data)
    }).finally(() => setLoading(false))

    // Build last 7 days chart data
    Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
        return salesApi.dailySummary(d).then(r => ({
          date: format(subDays(new Date(), 6 - i), 'dd/MM'),
          total: r.data.total_income || 0
        }))
      })
    ).then(setDailyData)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="animate-spin rounded-full h-8 w-8 border-2 border-transparent"
          style={{ borderTopColor: 'var(--gold-500)', borderRightColor: 'rgba(200,134,14,0.3)' }}
        />
      </div>
    )
  }

  const totalIncome = accounting?.total_income || 0
  const netProfit = accounting?.net_profit || 0
  const totalExpenses = accounting?.total_expenses || 0
  const marginPct = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ingresos (30d)"
          value={fmt.money(totalIncome)}
          icon={<DollarSign size={16} />}
          color="gold"
          subtitle="Últimos 30 días"
        />
        <StatCard
          title="Utilidad neta"
          value={fmt.money(netProfit)}
          icon={<TrendingUp size={16} />}
          color="green"
          subtitle={`Margen ${marginPct}%`}
        />
        <StatCard
          title="Gastos (30d)"
          value={fmt.money(totalExpenses)}
          icon={<ShoppingCart size={16} />}
          color="red"
        />
        <StatCard
          title="Barberos activos"
          value={barbers.length}
          icon={<Users size={16} />}
          color="blue"
          subtitle="En nómina"
        />
      </div>

      {/* Chart + breakdown */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Ingresos — últimos 7 días
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Resumen diario de ventas</p>
            </div>
            <div className="badge-gold">
              <TrendingUp size={11} />
              <span>7d</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C8860E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C8860E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(200,134,14,0.2)', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#C8860E"
                strokeWidth={2}
                fill="url(#goldGrad)"
                dot={{ fill: '#C8860E', strokeWidth: 0, r: 3 }}
                activeDot={{ fill: '#E4A225', strokeWidth: 0, r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Income breakdown */}
          <div className="card h-fit">
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
              Desglose ingresos (30d)
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Servicios',      value: accounting?.service_income || 0 },
                { label: 'Productos',      value: accounting?.product_income || 0 },
                { label: 'Transferencias', value: accounting?.transfer_income || 0 },
                { label: 'Efectivo',       value: accounting?.cash_income || 0 },
              ].map(item => {
                const pct = totalIncome > 0 ? (item.value / totalIncome) * 100 : 0
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {fmt.money(item.value)}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Low stock alert */}
          {lowStock.length > 0 && (
            <div className="card-sm" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} style={{ color: '#f87171' }} />
                <h3 className="font-semibold text-xs" style={{ color: '#f87171' }}>
                  Stock bajo — {lowStock.length} productos
                </h3>
              </div>
              <ul className="space-y-1.5">
                {lowStock.slice(0, 4).map(item => (
                  <li key={item.id} className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                    <span className="font-medium" style={{ color: '#fca5a5' }}>{item.stock_current} ud.</span>
                  </li>
                ))}
              </ul>
              <Link to="/inventory" className="flex items-center gap-1 text-xs mt-3 font-medium" style={{ color: '#f87171' }}>
                Ver inventario <ArrowRight size={11} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Barbers quick view */}
      {barbers.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Equipo
            </h3>
            <Link to="/barbers" className="text-xs font-medium" style={{ color: 'var(--gold-400)' }}>
              Ver todos
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {barbers.slice(0, 8).map(b => (
              <div key={b.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--surface-border)',
              }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(200,134,14,0.15)', color: 'var(--gold-400)' }}>
                  <Scissors size={12} />
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {b.name} {b.lastname || ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
