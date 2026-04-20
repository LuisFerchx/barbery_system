import { useEffect, useState } from 'react'
import { DollarSign, Users, ShoppingCart, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { accountingApi, inventoryApi, salesApi, barbersApi } from '../services/api'
import StatCard from '../components/ui/StatCard'
import { fmt } from '../utils/format'
import type { AccountingDashboard, InventoryItem, Barber } from '../types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, subDays } from 'date-fns'

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
        return salesApi.dailySummary(d).then(r => ({ date: format(subDays(new Date(), 6 - i), 'dd/MM'), total: r.data.total_income || 0 }))
      })
    ).then(setDailyData)
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ingresos (30d)" value={fmt.money(accounting?.total_income || 0)} icon={<DollarSign size={18} />} color="green" />
        <StatCard title="Utilidad neta" value={fmt.money(accounting?.net_profit || 0)} icon={<TrendingUp size={18} />} color="blue" />
        <StatCard title="Gastos (30d)" value={fmt.money(accounting?.total_expenses || 0)} icon={<ShoppingCart size={18} />} color="red" />
        <StatCard title="Barberos activos" value={barbers.length} icon={<Users size={18} />} color="purple" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Ingresos últimos 7 días</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmt.money(v)} />
              <Bar dataKey="total" fill="#c8860e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Desglose ingresos (30d)</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Servicios</span><span className="font-medium">{fmt.money(accounting?.service_income || 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Productos</span><span className="font-medium">{fmt.money(accounting?.product_income || 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Transferencias</span><span className="font-medium">{fmt.money(accounting?.transfer_income || 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Efectivo</span><span className="font-medium">{fmt.money(accounting?.cash_income || 0)}</span></div>
            </div>
          </div>

          {lowStock.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-600" />
                <h3 className="font-semibold text-amber-800 text-sm">Stock bajo ({lowStock.length})</h3>
              </div>
              <ul className="space-y-1">
                {lowStock.slice(0, 4).map(item => (
                  <li key={item.id} className="flex justify-between text-sm">
                    <span className="text-amber-700">{item.name}</span>
                    <span className="font-medium text-amber-800">{item.stock_current} ud.</span>
                  </li>
                ))}
              </ul>
              <Link to="/inventory" className="flex items-center gap-1 text-xs text-amber-600 mt-3 font-medium">
                Ver inventario <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
