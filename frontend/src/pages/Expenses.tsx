import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { expensesApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import { fmt } from '../utils/format'
import type { Expense } from '../types'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { value: 'rent', label: 'Renta' },
  { value: 'utilities', label: 'Servicios' },
  { value: 'supplies', label: 'Insumos' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Otro' },
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card_debit', label: 'Débito' },
  { value: 'card_credit', label: 'Crédito' },
  { value: 'transfer', label: 'Transferencia' },
]

const CAT_LABELS: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))
const PAY_LABELS: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map(p => [p.value, p.label]))

interface FormData {
  date: string
  category: string
  description: string
  amount: string
  payment_method: string
}

const EMPTY: FormData = {
  date: new Date().toISOString().split('T')[0],
  category: 'other',
  description: '',
  amount: '',
  payment_method: 'cash',
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [category, setCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const [year, mon] = month.split('-')
    const date_from = `${year}-${mon}-01`
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate()
    const date_to = `${year}-${mon}-${lastDay}`
    const params: Record<string, unknown> = { date_from, date_to }
    if (category) params.category = category
    expensesApi.list(params)
      .then(r => setExpenses(r.data))
      .catch(() => toast.error('Error al cargar gastos'))
      .finally(() => setLoading(false))
  }, [month, category])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setShowModal(true)
  }

  const openEdit = (e: Expense) => {
    setEditing(e)
    setForm({
      date: e.date.split('T')[0],
      category: e.category,
      description: e.description || '',
      amount: String(e.amount),
      payment_method: e.payment_method,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Ingresa el monto'); return }
    setSaving(true)
    try {
      const payload = {
        date: new Date(form.date + 'T12:00:00').toISOString(),
        category: form.category,
        description: form.description.trim() || null,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method,
      }
      if (editing) {
        await expensesApi.update(editing.id, payload)
        toast.success('Gasto actualizado')
      } else {
        await expensesApi.create(payload)
        toast.success('Gasto registrado')
      }
      setShowModal(false)
      load()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (e: Expense) => {
    if (!confirm('¿Eliminar este gasto?')) return
    try {
      await expensesApi.delete(e.id)
      toast.success('Gasto eliminado')
      load()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const total = expenses.reduce((acc, e) => acc + Number(e.amount), 0)

  const columns = [
    { key: 'date', label: 'Fecha', render: (v: string) => fmt.date(v) },
    { key: 'category', label: 'Categoría', render: (v: string) => CAT_LABELS[v] || v },
    { key: 'description', label: 'Descripción', render: (v: string | null) => v || <span style={{ color: 'var(--text-muted)' }}>—</span> },
    { key: 'amount', label: 'Monto', render: (v: number) => (
      <span className="font-semibold" style={{ color: '#f87171' }}>{fmt.money(Number(v))}</span>
    )},
    { key: 'payment_method', label: 'Pago', render: (v: string) => PAY_LABELS[v] || v },
  ]

  const f = (k: keyof FormData) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value })),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Gastos</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Registrar Gasto
        </button>
      </div>

      {/* Filters + total */}
      <div className="card mb-4 flex gap-3 flex-wrap items-end">
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Mes</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input" />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Categoría</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input">
            <option value="">Todas</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex-1" />
        <div className="text-right pb-1">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total del período</p>
          <p className="text-lg font-semibold" style={{ color: '#f87171' }}>{fmt.money(total)}</p>
        </div>
      </div>

      <Table
        columns={columns}
        data={expenses}
        loading={loading}
        actions={row => {
          const e = row as Expense
          return (
            <div className="flex gap-1">
              <button onClick={ev => { ev.stopPropagation(); openEdit(e) }} className="btn-icon" title="Editar">
                <Pencil size={14} />
              </button>
              <button onClick={ev => { ev.stopPropagation(); handleDelete(e) }} className="btn-icon text-red-400" title="Eliminar">
                <Trash2 size={14} />
              </button>
            </div>
          )
        }}
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Gasto' : 'Nuevo Gasto'}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Fecha</label>
              <input type="date" className="input w-full" {...f('date')} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Categoría</label>
              <select className="input w-full" {...f('category')}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Descripción</label>
            <input className="input w-full" placeholder="Descripción del gasto..." {...f('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Monto *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                <input type="number" step="0.01" min="0" placeholder="0.00" className="input w-full pl-7" {...f('amount')} />
              </div>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Método de pago</label>
              <select className="input w-full" {...f('payment_method')}>
                {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
