import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { salesApi, barbersApi, catalogApi } from '../services/api'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import { fmt, DRINKS } from '../utils/format'
import type { Sale, Barber, Service, Product } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const emptyForm = {
  date: format(new Date(), 'yyyy-MM-dd'),
  client_name: '',
  client_lastname: '',
  barber_id: '',
  service_id: '',
  service_value: '',
  product_id: '',
  product_value: '0',
  drink: 'NADA',
  total: '',
  bank_transfer: '0',
  barber_commission: '0',
  notes: '',
}

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Sale | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [filters, setFilters] = useState({ client_name: '', barber_id: '', date_from: '', date_to: '' })

  const fetchSales = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, page_size: 50 }
      if (filters.client_name) params.client_name = filters.client_name
      if (filters.barber_id) params.barber_id = filters.barber_id
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      const { data } = await salesApi.list(params)
      setSales(data.items)
      setTotal(data.total)
      setPages(data.pages)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { fetchSales() }, [fetchSales])

  useEffect(() => {
    Promise.all([barbersApi.list(), catalogApi.services(), catalogApi.products()]).then(
      ([b, s, p]) => { setBarbers(b.data); setServices(s.data); setProducts(p.data) }
    )
  }, [])

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (s: Sale) => {
    setEditing(s)
    setForm({
      date: s.date,
      client_name: s.client_name,
      client_lastname: s.client_lastname || '',
      barber_id: String(s.barber_id),
      service_id: String(s.service_id || ''),
      service_value: String(s.service_value),
      product_id: String(s.product_id || ''),
      product_value: String(s.product_value),
      drink: s.drink,
      total: String(s.total),
      bank_transfer: String(s.bank_transfer),
      barber_commission: String(s.barber_commission),
      notes: s.notes || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta venta?')) return
    await salesApi.delete(id)
    toast.success('Venta eliminada')
    fetchSales()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      barber_id: Number(form.barber_id),
      service_id: form.service_id ? Number(form.service_id) : null,
      service_value: Number(form.service_value),
      product_id: form.product_id ? Number(form.product_id) : null,
      product_value: Number(form.product_value),
      total: Number(form.total),
      bank_transfer: Number(form.bank_transfer),
      barber_commission: Number(form.barber_commission),
    }
    try {
      if (editing) {
        await salesApi.update(editing.id, payload)
        toast.success('Venta actualizada')
      } else {
        await salesApi.create(payload)
        toast.success('Venta registrada')
      }
      setShowModal(false)
      fetchSales()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al guardar'
      toast.error(msg)
    }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    { key: 'date',     header: 'Fecha',    render: (r: Sale) => fmt.date(r.date) },
    { key: 'client',   header: 'Cliente',  render: (r: Sale) => `${r.client_name} ${r.client_lastname || ''}`.trim() },
    { key: 'barber_name',  header: 'Barbero' },
    { key: 'service_name', header: 'Servicio' },
    { key: 'drink',    header: 'Bebida' },
    {
      key: 'total', header: 'Total',
      render: (r: Sale) => (
        <span className="font-semibold" style={{ color: 'var(--gold-400)' }}>{fmt.money(r.total)}</span>
      )
    },
    {
      key: 'bank_transfer', header: 'Transfer.',
      render: (r: Sale) => r.bank_transfer > 0
        ? <span style={{ color: '#60a5fa' }}>{fmt.money(r.bank_transfer)}</span>
        : <span style={{ color: 'var(--text-muted)' }}>-</span>
    },
    {
      key: 'barber_commission', header: 'Comisión',
      render: (r: Sale) => r.barber_commission > 0
        ? <span style={{ color: '#4ade80' }}>{fmt.money(r.barber_commission)}</span>
        : <span style={{ color: 'var(--text-muted)' }}>-</span>
    },
    {
      key: 'actions', header: '',
      render: (r: Sale) => (
        <div className="flex gap-1.5">
          <button
            onClick={() => openEdit(r)}
            className="btn-icon w-7 h-7"
            title="Editar"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => handleDelete(r.id)}
            className="btn-icon w-7 h-7"
            title="Eliminar"
            style={{ color: '#f87171' } as React.CSSProperties}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={filters.client_name}
              onChange={e => setFilters(f => ({ ...f, client_name: e.target.value }))}
              className="input-dark pl-9 w-44"
            />
          </div>
          <select
            value={filters.barber_id}
            onChange={e => setFilters(f => ({ ...f, barber_id: e.target.value }))}
            className="input-dark w-auto"
          >
            <option value="">Todos los barberos</option>
            {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input
            type="date"
            value={filters.date_from}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
            className="input-dark w-auto"
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
            className="input-dark w-auto"
          />
        </div>
        <button id="new-sale-btn" onClick={openNew} className="btn-gold">
          <Plus size={15} /> Nueva venta
        </button>
      </div>

      {/* Table card */}
      <div className="card p-0 overflow-hidden">
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {total} ventas encontradas
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-ghost px-3 py-1 text-xs disabled:opacity-30"
            >
              Ant.
            </button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{page}/{pages}</span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="btn-ghost px-3 py-1 text-xs disabled:opacity-30"
            >
              Sig.
            </button>
          </div>
        </div>
        <Table columns={columns} data={sales} loading={loading} />
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar venta' : 'Nueva venta'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required className="input-dark" />
            </div>
            <div>
              <label className="label">Barbero</label>
              <select value={form.barber_id} onChange={e => set('barber_id', e.target.value)} required className="input-dark">
                <option value="">Seleccionar</option>
                {barbers.map(b => <option key={b.id} value={b.id}>{b.name} {b.lastname || ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Nombre cliente</label>
              <input value={form.client_name} onChange={e => set('client_name', e.target.value)} required className="input-dark" />
            </div>
            <div>
              <label className="label">Apellido cliente</label>
              <input value={form.client_lastname} onChange={e => set('client_lastname', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label">Servicio</label>
              <select value={form.service_id} onChange={e => {
                const s = services.find(sv => sv.id === Number(e.target.value))
                set('service_id', e.target.value)
                if (s) { set('service_value', String(s.price)); set('barber_commission', String(s.commission)) }
              }} className="input-dark">
                <option value="">Sin servicio</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} - {fmt.money(s.price)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Valor servicio</label>
              <input type="number" step="0.01" value={form.service_value} onChange={e => set('service_value', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label">Producto</label>
              <select value={form.product_id} onChange={e => set('product_id', e.target.value)} className="input-dark">
                <option value="">Sin producto</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bebida</label>
              <select value={form.drink} onChange={e => set('drink', e.target.value)} className="input-dark">
                {DRINKS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Total</label>
              <input type="number" step="0.01" value={form.total} onChange={e => set('total', e.target.value)} required className="input-dark" />
            </div>
            <div>
              <label className="label">Transferencia bancaria</label>
              <input type="number" step="0.01" value={form.bank_transfer} onChange={e => set('bank_transfer', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label">Comisión barbero</label>
              <input type="number" step="0.01" value={form.barber_commission} onChange={e => set('barber_commission', e.target.value)} className="input-dark" />
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="input-dark" />
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
