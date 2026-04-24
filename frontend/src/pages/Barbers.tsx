import { useState, useEffect } from 'react'
import { Plus, Pencil, BarChart2 } from 'lucide-react'
import { barbersApi } from '../services/api'
import Modal from '../components/ui/Modal'
import { fmt } from '../utils/format'
import type { Barber, BarberDashboard } from '../types'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth } from 'date-fns'

const emptyForm = { name: '', lastname: '', phone: '', email: '', commission_rate: '45' }

export default function Barbers() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [selected, setSelected] = useState<Barber | null>(null)
  const [dashboard, setDashboard] = useState<BarberDashboard | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDash, setShowDash] = useState(false)
  const [editing, setEditing] = useState<Barber | null>(null)
  const [form, setForm] = useState(emptyForm)

  const fetchBarbers = async () => {
    const { data } = await barbersApi.list()
    setBarbers(data)
  }

  useEffect(() => { fetchBarbers() }, [])

  const openDashboard = async (b: Barber) => {
    setSelected(b)
    const from = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const to = format(endOfMonth(new Date()), 'yyyy-MM-dd')
    const { data } = await barbersApi.dashboard(b.id, { date_from: from, date_to: to })
    setDashboard(data)
    setShowDash(true)
  }

  const openEdit = (b: Barber) => {
    setEditing(b)
    setForm({ name: b.name, lastname: b.lastname || '', phone: b.phone || '', email: b.email || '', commission_rate: String(b.commission_rate) })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, commission_rate: Number(form.commission_rate) }
    try {
      if (editing) {
        await barbersApi.update(editing.id, payload)
        toast.success('Barbero actualizado')
      } else {
        await barbersApi.create(payload)
        toast.success('Barbero creado')
      }
      setShowModal(false)
      fetchBarbers()
    } catch {
      toast.error('Error al guardar')
    }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          id="new-barber-btn"
          onClick={() => { setEditing(null); setForm(emptyForm); setShowModal(true) }}
          className="btn-gold"
        >
          <Plus size={15} /> Nuevo barbero
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {barbers.map(b => (
          <div key={b.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {b.name} {b.lastname || ''}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Comisión: {b.commission_rate}%
                </p>
              </div>
              <span className={b.is_active ? 'badge-success' : 'badge-danger'}>
                {b.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            {b.phone && (
              <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>{b.phone}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => openDashboard(b)}
                className="btn-ghost flex-1 justify-center text-xs py-1.5"
              >
                <BarChart2 size={13} /> Dashboard
              </button>
              <button onClick={() => openEdit(b)} className="btn-icon">
                <Pencil size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar barbero' : 'Nuevo barbero'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[['name', 'Nombre'], ['lastname', 'Apellido'], ['phone', 'Teléfono'], ['email', 'Email']].map(([k, label]) => (
              <div key={k}>
                <label className="label">{label}</label>
                <input
                  value={form[k as keyof typeof form]}
                  onChange={e => set(k, e.target.value)}
                  required={k === 'name'}
                  className="input-dark"
                />
              </div>
            ))}
            <div>
              <label className="label">Comisión %</label>
              <input
                type="number" step="0.1"
                value={form.commission_rate}
                onChange={e => set('commission_rate', e.target.value)}
                className="input-dark"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-gold">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Dashboard modal */}
      <Modal open={showDash} onClose={() => setShowDash(false)} title={`Dashboard — ${selected?.name || ''}`} size="lg">
        {dashboard && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Clientes atendidos', value: dashboard.total_clients },
              { label: 'Ventas totales',     value: fmt.money(dashboard.total_sales) },
              { label: 'Comisiones',         value: fmt.money(dashboard.total_commissions) },
              { label: 'Adelantos',          value: fmt.money(dashboard.total_advances) },
              { label: 'Saldo neto',         value: fmt.money(dashboard.net_balance) },
              { label: 'Transferencias',     value: fmt.money(dashboard.total_bank_transfers) },
            ].map(({ label, value }) => (
              <div key={label} className="card-sm">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
