import { useState, useEffect } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { accountingApi } from '../services/api'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import Table from '../components/ui/Table'
import { fmt, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../utils/format'
import type { AccountingDashboard, Expense } from '../types'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#C8860E', '#60a5fa', '#4ade80', '#f59e0b', '#a78bfa']

export default function Accounting() {
  const [dash, setDash] = useState<AccountingDashboard | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showModal, setShowModal] = useState(false)
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'Toallas',
    description: '',
    amount: '',
    payment_method: 'efectivo',
  })

  const fetchAll = () => {
    accountingApi.dashboard({ date_from: dateFrom, date_to: dateTo }).then(r => setDash(r.data))
    accountingApi.expenses({ date_from: dateFrom, date_to: dateTo }).then(r => setExpenses(r.data))
  }
  useEffect(() => { fetchAll() }, [dateFrom, dateTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await accountingApi.createExpense({ ...form, amount: Number(form.amount) })
    toast.success('Gasto registrado')
    setShowModal(false)
    fetchAll()
  }

  const delExpense = async (id: number) => {
    if (!confirm('¿Eliminar gasto?')) return
    await accountingApi.deleteExpense(id)
    toast.success('Eliminado')
    fetchAll()
  }

  const incomeData = dash ? [
    { name: 'Servicios',      value: dash.service_income },
    { name: 'Productos',      value: dash.product_income },
    { name: 'Transferencias', value: dash.transfer_income },
  ] : []

  const columns = [
    { key: 'date',           header: 'Fecha',      render: (r: Expense) => fmt.date(r.date) },
    { key: 'category',       header: 'Categoría' },
    { key: 'description',    header: 'Descripción' },
    {
      key: 'amount', header: 'Monto',
      render: (r: Expense) => (
        <span className="font-semibold" style={{ color: '#f87171' }}>{fmt.money(r.amount)}</span>
      )
    },
    { key: 'payment_method', header: 'Método' },
    {
      key: 'actions', header: '',
      render: (r: Expense) => (
        <button onClick={() => delExpense(r.id)} className="btn-icon w-7 h-7" style={{ color: '#f87171' } as React.CSSProperties}>
          <Trash2 size={12} />
        </button>
      )
    },
  ]

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-dark w-auto" />
        <span style={{ color: 'var(--text-muted)' }} className="text-sm">a</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-dark w-auto" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ingresos totales"  value={fmt.money(dash?.total_income   || 0)} icon={<TrendingUp  size={16} />} color="gold" />
        <StatCard title="Gastos totales"    value={fmt.money(dash?.total_expenses || 0)} icon={<TrendingDown size={16} />} color="red" />
        <StatCard title="Utilidad neta"     value={fmt.money(dash?.net_profit     || 0)} icon={<TrendingUp  size={16} />} color="green" />
        <StatCard title="Efectivo"          value={fmt.money(dash?.cash_income    || 0)} icon={<TrendingUp  size={16} />} color="blue" />
      </div>

      {/* Charts + expenses */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Pie chart */}
        <div className="card">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Desglose de ingresos</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={incomeData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {incomeData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => fmt.money(v)}
                contentStyle={{
                  background: 'var(--surface-2)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Expenses */}
        <div className="card p-0 overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Gastos</h3>
            <button id="new-expense-btn" onClick={() => setShowModal(true)} className="btn-gold py-1.5 px-3 text-xs">
              <Plus size={13} /> Nuevo gasto
            </button>
          </div>
          <Table columns={columns} data={expenses} emptyText="Sin gastos en el período" />
        </div>
      </div>

      {/* Create expense modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Registrar gasto" size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Fecha</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="input-dark" />
          </div>
          <div>
            <label className="label">Categoría</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-dark">
              {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Descripción</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-dark" />
          </div>
          <div>
            <label className="label">Monto</label>
            <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className="input-dark" />
          </div>
          <div>
            <label className="label">Método de pago</label>
            <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="input-dark">
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-gold">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
