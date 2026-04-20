import { useState, useEffect } from 'react'
import { Plus, DollarSign } from 'lucide-react'
import { debtsApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import { fmt, PAYMENT_METHODS } from '../utils/format'
import type { Debt } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import clsx from 'clsx'

const STATUS_COLORS = { pendiente: 'bg-red-100 text-red-700', parcial: 'bg-yellow-100 text-yellow-700', pagado: 'bg-green-100 text-green-700' }

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({ client_name: '', client_lastname: '', client_phone: '', concept: '', original_amount: '', date: format(new Date(), 'yyyy-MM-dd'), due_date: '', notes: '' })
  const [payForm, setPayForm] = useState({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), payment_method: 'efectivo', note: '' })

  const fetch = () => debtsApi.list(statusFilter ? { status: statusFilter } : {}).then(r => setDebts(r.data))
  useEffect(() => { fetch() }, [statusFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await debtsApi.create({ ...form, original_amount: Number(form.original_amount) })
    toast.success('Deuda registrada')
    setShowModal(false)
    fetch()
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDebt) return
    await debtsApi.payment(selectedDebt.id, { ...payForm, amount: Number(payForm.amount) })
    toast.success('Pago registrado')
    setShowPayment(false)
    fetch()
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    { key: 'date', header: 'Fecha', render: (r: Debt) => fmt.date(r.date) },
    { key: 'client', header: 'Cliente', render: (r: Debt) => `${r.client_name} ${r.client_lastname || ''}`.trim() },
    { key: 'concept', header: 'Concepto' },
    { key: 'original_amount', header: 'Total', render: (r: Debt) => fmt.money(r.original_amount) },
    { key: 'paid_amount', header: 'Pagado', render: (r: Debt) => <span className="text-green-600">{fmt.money(r.paid_amount)}</span> },
    { key: 'pending_amount', header: 'Pendiente', render: (r: Debt) => <span className="font-medium text-red-600">{fmt.money(r.pending_amount)}</span> },
    { key: 'status', header: 'Estado', render: (r: Debt) => <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[r.status])}>{r.status}</span> },
    { key: 'actions', header: '', render: (r: Debt) => r.status !== 'pagado' && (
      <button onClick={() => { setSelectedDebt(r); setPayForm({ amount: String(r.pending_amount), date: format(new Date(), 'yyyy-MM-dd'), payment_method: 'efectivo', note: '' }); setShowPayment(true) }}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">
        <DollarSign size={12} /> Pagar
      </button>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          {[['', 'Todas'], ['pendiente', 'Pendiente'], ['parcial', 'Parcial'], ['pagado', 'Pagado']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={clsx('px-3 py-1.5 text-xs rounded-lg font-medium', statusFilter === val ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
          <Plus size={16} /> Nueva deuda
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <Table columns={columns} data={debts} emptyText="Sin deudas registradas" />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Registrar deuda">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input value={form.client_name} onChange={e => set('client_name', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Apellido</label>
              <input value={form.client_lastname} onChange={e => set('client_lastname', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Concepto</label>
            <input value={form.concept} onChange={e => set('concept', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto</label>
              <input type="number" step="0.01" value={form.original_amount} onChange={e => set('original_amount', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal open={showPayment} onClose={() => setShowPayment(false)} title={`Registrar pago - ${selectedDebt?.client_name || ''}`} size="sm">
        <form onSubmit={handlePayment} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Monto a pagar (pendiente: {fmt.money(selectedDebt?.pending_amount || 0)})</label>
            <input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Método</label>
            <select value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowPayment(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600">Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
