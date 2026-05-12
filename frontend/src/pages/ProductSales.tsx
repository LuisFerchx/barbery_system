import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { productSalesApi, inventoryApi, barbersApi, clientsApi } from '../services/api'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import { fmt } from '../utils/format'
import type { ProductSale, ProductSaleListOut, InventoryItem, Barber, Client } from '../types'
import toast from 'react-hot-toast'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card_debit', label: 'Débito' },
  { value: 'card_credit', label: 'Crédito' },
  { value: 'transfer', label: 'Transferencia' },
]

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card_debit: 'Débito',
  card_credit: 'Crédito',
  transfer: 'Transferencia',
}

interface SaleForm {
  date: string
  item_id: string
  barber_id: string
  client_id: string
  client_search: string
  quantity: string
  unit_price: string
  payment_method: string
  notes: string
}

const EMPTY_FORM: SaleForm = {
  date: new Date().toISOString().split('T')[0],
  item_id: '',
  barber_id: '',
  client_id: '',
  client_search: '',
  quantity: '1',
  unit_price: '',
  payment_method: 'cash',
  notes: '',
}

export default function ProductSales() {
  const [data, setData] = useState<ProductSaleListOut>({ items: [], total: 0, page: 1, page_size: 20, pages: 1 })
  const [items, setItems] = useState<InventoryItem[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [page, setPage] = useState(1)
  const [barberId, setBarberId] = useState('')
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<SaleForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showClientList, setShowClientList] = useState(false)

  useEffect(() => {
    inventoryApi.list('merchandise').then(r => setItems(Array.isArray(r.data) ? r.data : []))
    barbersApi.list({ active_only: true }).then(r => setBarbers(r.data))
    clientsApi.list({ active_only: true }).then(r => setClients(r.data))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const [year, mon] = month.split('-')
    const date_from = `${year}-${mon}-01T00:00:00`
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate()
    const date_to = `${year}-${mon}-${lastDay}T23:59:59`
    const params: Record<string, unknown> = { page, page_size: 20, date_from, date_to }
    if (barberId) params.barber_id = parseInt(barberId)
    productSalesApi.list(params)
      .then(r => setData(r.data))
      .catch(() => toast.error('Error al cargar ventas'))
      .finally(() => setLoading(false))
  }, [page, month, barberId])

  useEffect(() => { load() }, [load])

  const handleItemChange = (itemId: string) => {
    const found = items.find(i => String(i.id) === itemId)
    setForm(prev => ({
      ...prev,
      item_id: itemId,
      unit_price: found ? String(found.cost_per_unit) : prev.unit_price,
    }))
  }

  const handleSubmit = async () => {
    if (!form.item_id) { toast.error('Selecciona un producto'); return }
    if (!form.barber_id) { toast.error('Selecciona un barbero'); return }
    if (!form.unit_price || parseFloat(form.unit_price) <= 0) { toast.error('Ingresa el precio'); return }
    if (!form.quantity || parseInt(form.quantity) <= 0) { toast.error('Ingresa la cantidad'); return }
    setSaving(true)
    try {
      await productSalesApi.create({
        date: new Date(form.date + 'T12:00:00').toISOString(),
        item_id: parseInt(form.item_id),
        barber_id: parseInt(form.barber_id),
        client_id: form.client_id ? parseInt(form.client_id) : null,
        quantity: parseInt(form.quantity),
        unit_price: parseFloat(form.unit_price),
        payment_method: form.payment_method,
        notes: form.notes.trim() || null,
      })
      toast.success('Venta registrada')
      setShowModal(false)
      setForm(EMPTY_FORM)
      load()
    } catch {
      toast.error('Error al registrar venta')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta venta?')) return
    try {
      await productSalesApi.delete(id)
      toast.success('Venta eliminada')
      load()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const filteredClients = form.client_search.length >= 2
    ? clients.filter(c =>
      `${c.name} ${c.lastname}`.toLowerCase().includes(form.client_search.toLowerCase()) ||
      c.phone?.includes(form.client_search) ||
      c.identification_number?.includes(form.client_search)
    ).slice(0, 6)
    : []

  const f = (k: keyof SaleForm) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value })),
  })

  const columns = [
    { key: 'date', label: 'Fecha', render: (v: string) => fmt.date(v) },
    { key: 'item_name', label: 'Producto' },
    { key: 'barber_name', label: 'Barbero' },
    {
      key: 'client_name',
      label: 'Cliente',
      render: (v: string | null) => v || <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    { key: 'quantity', label: 'Cant.' },
    { key: 'unit_price', label: 'Precio', render: (v: number) => fmt.money(Number(v)) },
    {
      key: 'subtotal',
      label: 'Subtotal',
      render: (v: number) => <span style={{ color: 'var(--gold-400)' }}>{fmt.money(Number(v))}</span>,
    },
    { key: 'payment_method', label: 'Pago', render: (v: string) => PAYMENT_LABELS[v] || v },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Ventas</h1>
        <button
          onClick={() => { setForm(EMPTY_FORM); setShowModal(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Nueva Venta
        </button>
      </div>

      <div className="card mb-4 flex gap-3 flex-wrap">
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Mes</label>
          <input
            type="month"
            value={month}
            onChange={e => { setMonth(e.target.value); setPage(1) }}
            className="input"
          />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Barbero</label>
          <select value={barberId} onChange={e => { setBarberId(e.target.value); setPage(1) }} className="input">
            <option value="">Todos</option>
            {barbers.map(b => <option key={b.id} value={b.id}>{b.name} {b.lastname}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {data.total} ventas encontradas
          </span>
        </div>
      </div>

      <Table
        columns={columns}
        data={data.items}
        loading={loading}
        actions={row => (
          <button
            onClick={e => { e.stopPropagation(); handleDelete((row as ProductSale).id) }}
            className="btn-icon"
            title="Eliminar"
            style={{ color: '#f87171' }}
          >
            <Trash2 size={14} />
          </button>
        )}
      />

      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-icon">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {page} / {data.pages}
          </span>
          <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="btn-icon">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva Venta de Producto">
        <div className="space-y-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Fecha</label>
            <input type="date" className="input w-full" {...f('date')} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Producto *</label>
            <select
              className="input w-full"
              value={form.item_id}
              onChange={e => handleItemChange(e.target.value)}
            >
              <option value="">Seleccionar producto...</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Barbero *</label>
            <select className="input w-full" {...f('barber_id')}>
              <option value="">Seleccionar barbero...</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name} {b.lastname}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Cliente</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar cliente (opcional)..."
                className="input w-full"
                value={form.client_search}
                onChange={e => { setForm(prev => ({ ...prev, client_search: e.target.value })); setShowClientList(true) }}
                onFocus={() => setShowClientList(true)}
                onBlur={() => setTimeout(() => setShowClientList(false), 200)}
              />
              {showClientList && filteredClients.length > 0 && (
                <div
                  className="absolute z-10 w-full mt-1 rounded-xl shadow-xl overflow-hidden"
                  style={{ background: 'var(--surface-2)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                      onClick={() => {
                        setForm(prev => ({ ...prev, client_id: String(c.id), client_search: `${c.name} ${c.lastname}` }))
                        setShowClientList(false)
                      }}
                    >
                      {c.name} {c.lastname}
                      {c.phone && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{c.phone}</span>}
                      {c.identification_number && <span className="ml-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>ID: {c.identification_number}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Cantidad</label>
              <input type="number" min="1" className="input w-full" {...f('quantity')} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Precio de venta *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                <input type="number" step="0.01" min="0" placeholder="0.00" className="input w-full pl-7" {...f('unit_price')} />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Método de pago</label>
            <select className="input w-full" {...f('payment_method')}>
              {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Notas</label>
            <input className="input w-full" placeholder="Opcional..." {...f('notes')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Registrando...' : 'Registrar Venta'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
