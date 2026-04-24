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

  const fetchTransfers = () => {
    barbersApi.listTransfers().then(r => setTransfers(r.data))
    barbersApi.list().then(r => setBarbers(r.data))
  }
  useEffect(() => { fetchTransfers() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, barber_id: form.barber_id ? Number(form.barber_id) : undefined, amount: Number(form.amount) }
    await barbersApi.createTransfer(payload)
    toast.success('Transferencia registrada')
    setShowModal(false)
    fetchTransfers()
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    { key: 'date',           header: 'Fecha',     render: (r: BankTransfer) => fmt.date(r.date) },
    { key: 'recipient_name', header: 'Receptor' },
    { key: 'bank',           header: 'Banco' },
    {
      key: 'amount', header: 'Monto',
      render: (r: BankTransfer) => (
        <span className="font-semibold" style={{ color: 'var(--gold-400)' }}>{fmt.money(r.amount)}</span>
      )
    },
    { key: 'reference', header: 'Referencia', render: (r: BankTransfer) => r.reference || '-' },
    { key: 'note',      header: 'Nota',        render: (r: BankTransfer) => r.note || '-' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button id="new-transfer-btn" onClick={() => setShowModal(true)} className="btn-gold">
          <Plus size={15} /> Nueva transferencia
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <Table columns={columns} data={transfers} emptyText="Sin transferencias registradas" />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Registrar transferencia">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Barbero (opcional)</label>
            <select
              value={form.barber_id}
              onChange={e => {
                const b = barbers.find(b => b.id === Number(e.target.value))
                set('barber_id', e.target.value)
                if (b) set('recipient_name', `${b.name} ${b.lastname || ''}`.trim())
              }}
              className="input-dark"
            >
              <option value="">Sin barbero asociado</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name} {b.lastname || ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nombre receptor</label>
            <input value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)} required className="input-dark" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monto</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required className="input-dark" />
            </div>
            <div>
              <label className="label">Banco</label>
              <select value={form.bank} onChange={e => set('bank', e.target.value)} className="input-dark">
                {BANKS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Referencia</label>
            <input value={form.reference} onChange={e => set('reference', e.target.value)} className="input-dark" />
          </div>
          <div>
            <label className="label">Nota</label>
            <input value={form.note} onChange={e => set('note', e.target.value)} className="input-dark" />
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
