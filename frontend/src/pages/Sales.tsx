import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, Pencil, Trash2 } from 'lucide-react'
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
    { key: 'date', header: 'Fecha', render: (r: Sale) => fmt.date(r.date) },
    { key: 'client', header: 'Cliente', render: (r: Sale) => `${r.client_name} ${r.client_lastname || ''}`.trim() },
    { key: 'barber_name', header: 'Barbero' },
    { key: 'service_name', header: 'Servicio' },
    { key: 'drink', header: 'Bebida' },
    { key: 'total', header: 'Total', render: (r: Sale) => <span className="font-medium">{fmt.money(r.total)}</span> },
    { key: 'bank_transfer', header: 'Transfer.', render: (r: Sale) => r.bank_transfer > 0 ? fmt.money(r.bank_transfer) : '-' },
    { key: 'barber_commission', header: 'Comisión', render: (r: Sale) => r.barber_commission > 0 ? fmt.money(r.barber_commission) : '-' },
    {
      key: 'actions', header: '', render: (r: Sale) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(r)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
          <button onClick={() => handleDelete(r.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <input
            type="text" placeholder="Buscar cliente..."
            value={filters.client_name}
            onChange={e => setFilters(f => ({ ...f, client_name: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 w-44"
          />
          <select
            value={filters.barber_id}
            onChange={e => setFilters(f => ({ ...f, barber_id: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">Todos los barberos</option>
            {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" />
          <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" />
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
          <Plus size={16} /> Nueva venta
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">{total} ventas encontradas</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 text-xs border rounded disabled:opacity-40">Ant.</button>
            <span className="px-3 py-1 text-xs text-gray-500">{page}/{pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="px-3 py-1 text-xs border rounded disabled:opacity-40">Sig.</button>
          </div>
        </div>
        <Table columns={columns} data={sales} loading={loading} />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar venta' : 'Nueva venta'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Barbero</label>
              <select value={form.barber_id} onChange={e => set('barber_id', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="">Seleccionar</option>
                {barbers.map(b => <option key={b.id} value={b.id}>{b.name} {b.lastname || ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre cliente</label>
              <input value={form.client_name} onChange={e => set('client_name', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Apellido cliente</label>
              <input value={form.client_lastname} onChange={e => set('client_lastname', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Servicio</label>
              <select value={form.service_id} onChange={e => {
                const s = services.find(sv => sv.id === Number(e.target.value))
                set('service_id', e.target.value)
                if (s) { set('service_value', String(s.price)); set('barber_commission', String(s.commission)) }
              }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="">Sin servicio</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} - {fmt.money(s.price)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor servicio</label>
              <input type="number" step="0.01" value={form.service_value} onChange={e => set('service_value', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Producto</label>
              <select value={form.product_id} onChange={e => set('product_id', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="">Sin producto</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bebida</label>
              <select value={form.drink} onChange={e => set('drink', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                {DRINKS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total</label>
              <input type="number" step="0.01" value={form.total} onChange={e => set('total', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Transferencia bancaria</label>
              <input type="number" step="0.01" value={form.bank_transfer} onChange={e => set('bank_transfer', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Comisión barbero</label>
              <input type="number" step="0.01" value={form.barber_commission} onChange={e => set('barber_commission', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
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
