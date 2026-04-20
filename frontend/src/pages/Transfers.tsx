import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { barbersApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import { fmt, BANKS } from '../utils/format'
import type { BankTransfer, Barber } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function Transfers() {
  const [transfers, setTransfers] = useState<BankTransfer[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ barber_id: '', recipient_name: '', amount: '', bank: 'Pichincha', reference: '', note: '' })

  const fetch = () => {
    barbersApi.listTransfers().then(r => setTransfers(r.data))
    barbersApi.list().then(r => setBarbers(r.data))
  }
  useEffect(() => { fetch() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, barber_id: form.barber_id ? Number(form.barber_id) : undefined, amount: Number(form.amount) }
    await barbersApi.createTransfer(payload)
    toast.success('Transferencia registrada')
    setShowModal(false)
    fetch()
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    { key: 'date', header: 'Fecha', render: (r: BankTransfer) => fmt.date(r.date) },
    { key: 'recipient_name', header: 'Receptor' },
    { key: 'bank', header: 'Banco' },
    { key: 'amount', header: 'Monto', render: (r: BankTransfer) => <span className="font-medium">{fmt.money(r.amount)}</span> },
    { key: 'reference', header: 'Referencia', render: (r: BankTransfer) => r.reference || '-' },
    { key: 'note', header: 'Nota', render: (r: BankTransfer) => r.note || '-' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
          <Plus size={16} /> Nueva transferencia
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <Table columns={columns} data={transfers} emptyText="Sin transferencias registradas" />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Registrar transferencia">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Barbero (opcional)</label>
            <select value={form.barber_id} onChange={e => {
              const b = barbers.find(b => b.id === Number(e.target.value))
              set('barber_id', e.target.value)
              if (b) set('recipient_name', `${b.name} ${b.lastname || ''}`.trim())
            }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
              <option value="">Sin barbero asociado</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name} {b.lastname || ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre receptor</label>
            <input value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
              <select value={form.bank} onChange={e => set('bank', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                {BANKS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Referencia</label>
            <input value={form.reference} onChange={e => set('reference', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nota</label>
            <input value={form.note} onChange={e => set('note', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
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
