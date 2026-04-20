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
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#c8860e', '#3b82f6', '#10b981', '#f59e0b', '#6366f1']

export default function Accounting() {
  const [dash, setDash] = useState<AccountingDashboard | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showModal, setShowModal] = useState(false)
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), category: 'Toallas', description: '', amount: '', payment_method: 'efectivo' })

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
    { name: 'Servicios', value: dash.service_income },
    { name: 'Productos', value: dash.product_income },
    { name: 'Transferencias', value: dash.transfer_income },
  ] : []

  const columns = [
    { key: 'date', header: 'Fecha', render: (r: Expense) => fmt.date(r.date) },
    { key: 'category', header: 'Categoría' },
    { key: 'description', header: 'Descripción' },
    { key: 'amount', header: 'Monto', render: (r: Expense) => <span className="font-medium text-red-600">{fmt.money(r.amount)}</span> },
    { key: 'payment_method', header: 'Método' },
    { key: 'actions', header: '', render: (r: Expense) => (
      <button onClick={() => delExpense(r.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" />
        <span className="text-gray-400 text-sm">a</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ingresos totales" value={fmt.money(dash?.total_income || 0)} icon={<TrendingUp size={18} />} color="green" />
        <StatCard title="Gastos totales" value={fmt.money(dash?.total_expenses || 0)} icon={<TrendingDown size={18} />} color="red" />
        <StatCard title="Utilidad neta" value={fmt.money(dash?.net_profit || 0)} icon={<TrendingUp size={18} />} color="blue" />
        <StatCard title="Efectivo" value={fmt.money(dash?.cash_income || 0)} icon={<TrendingUp size={18} />} color="yellow" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Desglose de ingresos</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={incomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {incomeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmt.money(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Gastos</h3>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 text-sm bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600">
              <Plus size={14} /> Nuevo gasto
            </button>
          </div>
          <Table columns={columns} data={expenses} emptyText="Sin gastos en el período" />
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Registrar gasto" size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
              {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Monto</label>
            <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago</label>
            <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
