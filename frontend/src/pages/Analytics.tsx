import { useState, useEffect } from 'react'
import { analyticsApi } from '../services/api'
import StatCard from '../components/ui/StatCard'
import { Users, Repeat, TrendingUp, ShoppingBag } from 'lucide-react'
import { fmt } from '../utils/format'
import type { ClientMetrics, CrossSellMetrics, CourtesyDrinksMetrics } from '../types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'

export default function Analytics() {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [clients, setClients] = useState<ClientMetrics | null>(null)
  const [crossSell, setCrossSell] = useState<CrossSellMetrics | null>(null)
  const [courtesyDrinks, setCourtesyDrinks] = useState<CourtesyDrinksMetrics | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      analyticsApi.clients(month),
      analyticsApi.crossSell(month),
      analyticsApi.courtesyDrinks(month),
    ])
      .then(([c, x, d]) => { setClients(c.data); setCrossSell(x.data); setCourtesyDrinks(d.data) })
      .catch(() => toast.error('Error al cargar analítica'))
      .finally(() => setLoading(false))
  }, [month])

  const clientChartData = clients ? [
    { name: 'Nuevos', value: clients.new_clients, fill: '#60a5fa' },
    { name: 'Recurrentes', value: clients.returning_clients, fill: '#4ade80' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Analítica</h1>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="input text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent"
            style={{ borderTopColor: 'var(--gold-500)', borderRightColor: 'rgba(200,134,14,0.3)' }} />
        </div>
      ) : (
        <>
          {/* Client metrics */}
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>CLIENTES</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Nuevos"
                value={clients?.new_clients ?? 0}
                icon={<Users size={16} />}
                color="blue"
              />
              <StatCard
                title="Recurrentes"
                value={clients?.returning_clients ?? 0}
                icon={<Repeat size={16} />}
                color="green"
              />
              <StatCard
                title="Total"
                value={clients?.total_clients ?? 0}
                icon={<Users size={16} />}
                color="gold"
              />
              <StatCard
                title="Retención"
                value={`${((clients?.retention_rate ?? 0) * 100).toFixed(1)}%`}
                icon={<TrendingUp size={16} />}
                color="green"
                subtitle="Clientes recurrentes / total"
              />
            </div>
          </div>

          {/* Client chart */}
          <div className="card">
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
              Nuevos vs Recurrentes
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={clientChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                />
                <Bar dataKey="value" name="Clientes" radius={[4, 4, 0, 0]}>
                  {clientChartData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cross-sell */}
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>VENTA CRUZADA</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <StatCard
                title="Total servicios"
                value={crossSell?.total_services ?? 0}
                icon={<TrendingUp size={16} />}
                color="gold"
              />
              <StatCard
                title="Con venta cruzada"
                value={crossSell?.cross_sell_count ?? 0}
                icon={<ShoppingBag size={16} />}
                color="green"
              />
              <StatCard
                title="Tasa global"
                value={`${((crossSell?.overall_rate ?? 0) * 100).toFixed(1)}%`}
                icon={<TrendingUp size={16} />}
                color="blue"
              />
            </div>

            {/* By barber table */}
            {(crossSell?.by_barber?.length ?? 0) > 0 && (
              <div className="card">
                <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
                  Por Barbero
                </h3>
                <div className="space-y-2">
                  {crossSell!.by_barber.map(b => (
                    <div key={b.barber_id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {b.name} {b.lastname}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {b.product_sales_count} ventas de producto / {b.total_services} servicios
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>
                          {(b.cross_sell_rate * 100).toFixed(1)}%
                        </p>
                        <div className="w-20 h-1.5 rounded-full mt-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(b.cross_sell_rate * 100, 100)}%`, background: '#4ade80' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top courtesy drinks */}
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>TOP BEBIDAS DE CORTESÍA</h2>
            <div className="card">
              {!courtesyDrinks || courtesyDrinks.top_drinks.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin datos este mes</p>
              ) : (
                <div className="space-y-3">
                  {courtesyDrinks.top_drinks.map((d, i) => (
                    <div key={d.item_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background: i === 0 ? 'rgba(200,134,14,0.2)' : 'rgba(255,255,255,0.06)',
                            color: i === 0 ? 'var(--gold-400)' : 'var(--text-muted)',
                          }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{d.name}</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--gold-400)' }}>
                        {d.count} {d.count === 1 ? 'vez' : 'veces'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
