import { useState, useEffect } from 'react'
import { Plus, DollarSign } from 'lucide-react'
import { debtsApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import { fmt, PAYMENT_METHODS } from '../utils/format'
import type { Debt } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const STATUS_BADGE: Record<string, string> = {
  pendiente: 'badge-danger',
  parcial:   'badge-gold',
  pagado:    'badge-success',
}

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({
    client_name: '', client_lastname: '', client_phone: '',
    concept: '', original_amount: '',
    date: format(new Date(), 'yyyy-MM-dd'), due_date: '', notes: '',
  })
  const [payForm, setPayForm] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'efectivo',
    note: '',
  })

  const fetchDebts = () => debtsApi.list(statusFilter ? { status: statusFilter } : {}).then(r => setDebts(r.data))
  useEffect(() => { fetchDebts() }, [statusFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await debtsApi.create({ ...form, original_amount: Number(form.original_amount) })
    toast.success('Deuda registrada')
    setShowModal(false)
    fetchDebts()
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDebt) return
    await debtsApi.payment(selectedDebt.id, { ...payForm, amount: Number(payForm.amount) })
    toast.success('Pago registrado')
    setShowPayment(false)
    fetchDebts()
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const openPayment = (r: Debt) => {
    setSelectedDebt(r)
    setPayForm({ amount: String(r.pending_amount), date: format(new Date(), 'yyyy-MM-dd'), payment_method: 'efectivo', note: '' })
    setShowPayment(true)
  }

  const columns = [
    { key: 'date',   header: 'Fecha',    render: (r: Debt) => fmt.date(r.date) },
    { key: 'client', header: 'Cliente',  render: (r: Debt) => `${r.client_name} ${r.client_lastname || ''}`.trim() },
    { key: 'concept', header: 'Concepto' },
    { key: 'original_amount', header: 'Total',    render: (r: Debt) => fmt.money(r.original_amount) },
    {
      key: 'paid_amount', header: 'Pagado',
      render: (r: Debt) => <span style={{ color: '#4ade80' }}>{fmt.money(r.paid_amount)}</span>
    },
    {
      key: 'pending_amount', header: 'Pendiente',
      render: (r: Debt) => <span className="font-semibold" style={{ color: '#f87171' }}>{fmt.money(r.pending_amount)}</span>
    },
    {
      key: 'status', header: 'Estado',
      render: (r: Debt) => <span className={STATUS_BADGE[r.status] || 'badge-gold'}>{r.status}</span>
    },
    {
      key: 'actions', header: '',
      render: (r: Debt) => r.status !== 'pagado' && (
        <button
          onClick={() => openPayment(r)}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg"
          style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <DollarSign size={11} /> Pagar
        </button>
      )
    },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          {[['', 'Todas'], ['pendiente', 'Pendiente'], ['parcial', 'Parcial'], ['pagado', 'Pagado']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={statusFilter === val ? 'btn-gold py-1.5 px-3 text-xs' : 'btn-ghost py-1.5 px-3 text-xs'}
            >
              {label}
            </button>
          ))}
        </div>
        <button id="new-debt-btn" onClick={() => setShowModal(true)} className="btn-gold">
          <Plus size={15} /> Nueva deuda
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <Table columns={columns} data={debts} emptyText="Sin deudas registradas" />
      </div>

      {/* Create debt modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Registrar deuda">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre</label>
              <input value={form.client_name} onChange={e => set('client_name', e.target.value)} required className="input-dark" />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input value={form.client_lastname} onChange={e => set('client_lastname', e.target.value)} className="input-dark" />
            </div>
          </div>
          <div>
            <label className="label">Concepto</label>
            <input value={form.concept} onChange={e => set('concept', e.target.value)} required className="input-dark" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monto</label>
              <input type="number" step="0.01" value={form.original_amount} onChange={e => set('original_amount', e.target.value)} required className="input-dark" />
            </div>
            <div>
              <label className="label">Fecha</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required className="input-dark" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-gold">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Payment modal */}
      <Modal open={showPayment} onClose={() => setShowPayment(false)} title={`Registrar pago — ${selectedDebt?.client_name || ''}`} size="sm">
        <form onSubmit={handlePayment} className="space-y-4">
          <div>
            <label className="label">
              Monto a pagar
              <span className="ml-1" style={{ color: 'var(--text-muted)' }}>
                (pendiente: {fmt.money(selectedDebt?.pending_amount || 0)})
              </span>
            </label>
            <input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required className="input-dark" />
          </div>
          <div>
            <label className="label">Fecha</label>
            <input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} required className="input-dark" />
          </div>
          <div>
            <label className="label">Método</label>
            <select value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))} className="input-dark">
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
            <button type="button" onClick={() => setShowPayment(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-gold">Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
