import { useState, useEffect } from 'react'
import { Plus, Pencil, BarChart2, ChevronRight } from 'lucide-react'
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

  const fetch = async () => {
    const { data } = await barbersApi.list()
    setBarbers(data)
  }

  useEffect(() => { fetch() }, [])

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
      fetch()
    } catch {
      toast.error('Error al guardar')
    }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowModal(true) }} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
          <Plus size={16} /> Nuevo barbero
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {barbers.map(b => (
          <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-800">{b.name} {b.lastname || ''}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Comisión: {b.commission_rate}%</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {b.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            {b.phone && <p className="text-xs text-gray-500 mb-3">{b.phone}</p>}
            <div className="flex gap-2">
              <button onClick={() => openDashboard(b)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                <BarChart2 size={13} /> Dashboard
              </button>
              <button onClick={() => openEdit(b)} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Pencil size={13} className="text-gray-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar barbero' : 'Nuevo barbero'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[['name', 'Nombre'], ['lastname', 'Apellido'], ['phone', 'Teléfono'], ['email', 'Email']].map(([k, label]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input value={form[k as keyof typeof form]} onChange={e => set(k, e.target.value)}
                  required={k === 'name'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Comisión %</label>
              <input type="number" step="0.1" value={form.commission_rate} onChange={e => set('commission_rate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal open={showDash} onClose={() => setShowDash(false)} title={`Dashboard - ${selected?.name || ''}`} size="lg">
        {dashboard && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Clientes atendidos', value: dashboard.total_clients },
                { label: 'Ventas totales', value: fmt.money(dashboard.total_sales) },
                { label: 'Comisiones', value: fmt.money(dashboard.total_commissions) },
                { label: 'Adelantos', value: fmt.money(dashboard.total_advances) },
                { label: 'Saldo neto', value: fmt.money(dashboard.net_balance) },
                { label: 'Transferencias', value: fmt.money(dashboard.total_bank_transfers) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
