import { useEffect, useState } from 'react'
import { TrendingUp, ShoppingBag, AlertTriangle, Scissors, Package, ArrowRight, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../services/api'
import StatCard from '../components/ui/StatCard'
import { fmt } from '../utils/format'
import type { DashboardSummary } from '../types'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const SPLIT_COLORS = ['#4ade80', '#60a5fa', '#f87171', '#c084fc']
const SPLIT_LABELS: Record<string, string> = {
  profit: 'Ganancia',
  owner_salary: 'Sueldo socios',
  taxes: 'Impuestos',
  operating: 'Gastos op.',
}

interface PieTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number }>
}

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="card-sm px-3 py-2 text-xs">
      <p style={{ color: 'var(--text-muted)' }}>{payload[0].name}</p>
      <p className="font-semibold mt-0.5" style={{ color: 'var(--gold-400)' }}>{fmt.money(payload[0].value)}</p>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    dashboardApi.summary(month)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [month])

  const splitData = data ? [
    { name: SPLIT_LABELS.profit, value: Number(data.split_breakdown.profit) },
    { name: SPLIT_LABELS.owner_salary, value: Number(data.split_breakdown.owner_salary) },
    { name: SPLIT_LABELS.taxes, value: Number(data.split_breakdown.taxes) },
    { name: SPLIT_LABELS.operating, value: Number(data.split_breakdown.operating) },
  ] : []

  const ownerSalary = Number(data?.split_breakdown?.owner_salary ?? 0)
  const netProfit = Number(data?.net_profit ?? 0) - ownerSalary
  const netIsPositive = netProfit >= 0

  return (
    <div className="space-y-6">
      {/* Header + month selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="input text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div
            className="animate-spin rounded-full h-8 w-8 border-2 border-transparent"
            style={{ borderTopColor: 'var(--gold-500)', borderRightColor: 'rgba(200,134,14,0.3)' }}
          />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              title="Ingresos Cortes"
              value={fmt.money(Number(data?.service_gross_income ?? 0))}
              icon={<Scissors size={16} />}
              color="gold"
              subtitle="Servicios del mes"
            />
            <StatCard
              title="Ingresos Productos"
              value={fmt.money(Number(data?.product_gross_income ?? 0))}
              icon={<Package size={16} />}
              color="blue"
              subtitle="Ventas de productos"
            />
            <StatCard
              title="Comisiones Barberos"
              value={fmt.money(Number(data?.barber_commissions_total ?? 0))}
              icon={<Users size={16} />}
              color="red"
              subtitle="Pagado a barberos"
            />
            <StatCard
              title="Ingreso Real"
              value={fmt.money(Number(data?.real_income_total ?? 0))}
              icon={<TrendingUp size={16} />}
              color="green"
              subtitle="Después de comisiones"
            />
            <StatCard
              title="Gastos Operativos"
              value={fmt.money(Number(data?.total_expenses ?? 0))}
              icon={<ShoppingBag size={16} />}
              color="red"
              subtitle="Del mes"
            />
            <StatCard
              title="Utilidad Neta"
              value={fmt.money(Number(data?.net_profit ?? 0))}
              icon={<TrendingUp size={16} />}
              color={netIsPositive ? 'green' : 'red'}
              subtitle={netIsPositive ? 'Positivo' : 'Negativo'}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {/* Donut chart */}
            <div className="lg:col-span-2 card">
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                Distribución del Ingreso Real
              </h3>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                Split del ingreso real del mes
              </p>

              {data && data.real_income_total > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={splitData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {splitData.map((_, i) => (
                        <Cell key={i} fill={SPLIT_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48" style={{ color: 'var(--text-muted)' }}>
                  <p className="text-sm">Sin ventas este mes</p>
                </div>
              )}

              {/* Split summary row */}
              {data && data.real_income_total > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {splitData.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: SPLIT_COLORS[i] }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.name}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: SPLIT_COLORS[i] }}>{fmt.money(s.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Summary numbers */}
              <div className="card space-y-2">
                <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Resumen</h3>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>↳ Cortes</span>
                  <span style={{ color: 'var(--gold-400)' }}>{fmt.money(Number(data?.service_gross_income ?? 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>↳ Productos</span>
                  <span style={{ color: '#60a5fa' }}>{fmt.money(Number(data?.product_gross_income ?? 0))}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span style={{ color: 'var(--text-secondary)' }}>Ingreso Bruto</span>
                  <span style={{ color: 'var(--gold-400)' }}>{fmt.money(Number(data?.gross_income ?? 0))}</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '0.25rem', paddingTop: '0.25rem' }} />
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Comisiones barberos</span>
                  <span style={{ color: '#f87171' }}>-{fmt.money(Number(data?.barber_commissions_total ?? 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Ingresos reales</span>
                  <span style={{ color: '#4ade80' }}>{fmt.money(Number(data?.real_income_total ?? 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Gastos</span>
                  <span style={{ color: '#f87171' }}>-{fmt.money(Number(data?.total_expenses ?? 0))}</span>
                </div>
                {(data?.cash_closings_count ?? 0) > 0 || (data?.cash_register_adjustments ?? 0) !== 0 ? (
                  <div className="flex justify-between text-sm">
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Ajustes de caja</span>
                      <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                        ({data?.cash_closings_count ?? 0} cierre{(data?.cash_closings_count ?? 0) !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <span style={{ color: (data?.cash_register_adjustments ?? 0) >= 0 ? '#4ade80' : '#f87171' }}>
                      {(data?.cash_register_adjustments ?? 0) >= 0 ? '+' : ''}{fmt.money(Number(data?.cash_register_adjustments ?? 0))}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Utilidad operativa</span>
                  <span style={{ color: '#60a5fa' }}>{fmt.money(Number(data?.operating_profit ?? 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Impuestos reservados</span>
                  <span style={{ color: '#c084fc' }}>-{fmt.money(Number(data?.taxes_reserved ?? 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Sueldo socios</span>
                  <span style={{ color: '#f97316' }}>-{fmt.money(ownerSalary)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: 'var(--gold-400)' }}>Utilidad Neta</span>
                  <span style={{ color: netIsPositive ? '#4ade80' : '#f87171' }}>
                    {fmt.money(netProfit)}
                  </span>
                </div>
              </div>

              {/* Inventory alerts */}
              {(data?.inventory_alerts?.length ?? 0) > 0 && (
                <div className="card-sm" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} style={{ color: '#f87171' }} />
                    <h3 className="font-semibold text-xs" style={{ color: '#f87171' }}>
                      Stock bajo — {data!.inventory_alerts.length} items
                    </h3>
                  </div>
                  <ul className="space-y-1.5">
                    {data!.inventory_alerts.slice(0, 5).map(a => (
                      <li key={a.item_id} className="flex justify-between text-xs">
                        <span style={{ color: 'var(--text-secondary)' }}>{a.name}</span>
                        <span className="font-medium" style={{ color: '#fca5a5' }}>
                          {a.stock_current}/{a.stock_minimum}
                        </span>
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

          {/* Top barbers */}
          {(data?.top_barbers?.length ?? 0) > 0 && (
            <div className="card">
              <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
                Top Barberos — {month}
              </h3>
              <div className="space-y-2">
                {data!.top_barbers.map((b, idx) => (
                  <div key={b.barber_id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-xs font-bold w-5 text-center" style={{ color: idx === 0 ? 'var(--gold-400)' : 'var(--text-muted)' }}>
                      #{idx + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,134,14,0.15)' }}>
                      <Scissors size={12} style={{ color: 'var(--gold-400)' }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {b.name} {b.lastname}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>
                        {fmt.money(Number(b.total_real_income))}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {b.total_sales} cortes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
