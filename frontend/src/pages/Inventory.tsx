import { useState, useEffect } from 'react'
import { Plus, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react'
import { inventoryApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import type { InventoryItem } from '../types'
import toast from 'react-hot-toast'

const emptyForm = {
  name: '', category: 'bebida', unit: 'unidad',
  stock_current: '0', low_stock_alert: '5',
  cost_price: '0', sale_price: '0'
}

const CATEGORIES = ['', 'bebida', 'producto', 'insumo']

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showMovement, setShowMovement] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [movForm, setMovForm] = useState({ movement_type: 'entrada', quantity: '1', reason: '' })
  const [category, setCategory] = useState('')

  const fetchInventory = () => inventoryApi.list(category || undefined).then(r => setItems(r.data))
  useEffect(() => { fetchInventory() }, [category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      stock_current: Number(form.stock_current),
      low_stock_alert: Number(form.low_stock_alert),
      cost_price: Number(form.cost_price),
      sale_price: Number(form.sale_price),
    }
    await inventoryApi.create(payload)
    toast.success('Item creado')
    setShowModal(false)
    fetchInventory()
  }

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return
    await inventoryApi.addMovement(selectedItem.id, { ...movForm, quantity: Number(movForm.quantity) })
    toast.success('Movimiento registrado')
    setShowMovement(false)
    fetchInventory()
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const openMovement = (item: InventoryItem, type: 'entrada' | 'salida') => {
    setSelectedItem(item)
    setMovForm({ movement_type: type, quantity: '1', reason: '' })
    setShowMovement(true)
  }

  const columns = [
    { key: 'name', header: 'Producto' },
    { key: 'category', header: 'Categoría' },
    {
      key: 'stock_current', header: 'Stock',
      render: (r: InventoryItem) => (
        <span className="font-medium flex items-center gap-1.5"
          style={{ color: r.stock_current <= r.low_stock_alert ? '#f87171' : 'var(--text-primary)' }}>
          {r.stock_current <= r.low_stock_alert && <AlertTriangle size={12} />}
          {r.stock_current} {r.unit}
        </span>
      )
    },
    { key: 'low_stock_alert', header: 'Alerta mín.' },
    {
      key: 'actions', header: '',
      render: (r: InventoryItem) => (
        <div className="flex gap-1.5">
          <button
            onClick={() => openMovement(r, 'entrada')}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <ArrowDown size={11} /> Entrada
          </button>
          <button
            onClick={() => openMovement(r, 'salida')}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <ArrowUp size={11} /> Salida
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={category === cat ? 'btn-gold py-1.5 px-3 text-xs' : 'btn-ghost py-1.5 px-3 text-xs'}
            >
              {cat || 'Todos'}
            </button>
          ))}
        </div>
        <button
          id="new-inventory-btn"
          onClick={() => { setForm(emptyForm); setShowModal(true) }}
          className="btn-gold"
        >
          <Plus size={15} /> Nuevo item
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <Table columns={columns} data={items} />
      </div>

      {/* Create modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo item de inventario">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nombre</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required className="input-dark" />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="input-dark">
                <option value="bebida">Bebida</option>
                <option value="producto">Producto</option>
                <option value="insumo">Insumo</option>
              </select>
            </div>
            <div>
              <label className="label">Unidad</label>
              <input value={form.unit} onChange={e => set('unit', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label">Stock inicial</label>
              <input type="number" value={form.stock_current} onChange={e => set('stock_current', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label">Alerta mínimo</label>
              <input type="number" value={form.low_stock_alert} onChange={e => set('low_stock_alert', e.target.value)} className="input-dark" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-gold">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Movement modal */}
      <Modal open={showMovement} onClose={() => setShowMovement(false)} title={`Movimiento — ${selectedItem?.name || ''}`} size="sm">
        <form onSubmit={handleMovement} className="space-y-4">
          <div>
            <label className="label">Tipo</label>
            <select value={movForm.movement_type} onChange={e => setMovForm(f => ({ ...f, movement_type: e.target.value }))} className="input-dark">
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>
          <div>
            <label className="label">Cantidad</label>
            <input type="number" min="1" value={movForm.quantity} onChange={e => setMovForm(f => ({ ...f, quantity: e.target.value }))} required className="input-dark" />
          </div>
          <div>
            <label className="label">Motivo</label>
            <input value={movForm.reason} onChange={e => setMovForm(f => ({ ...f, reason: e.target.value }))} className="input-dark" />
          </div>
          <div className="flex gap-3 justify-end" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
            <button type="button" onClick={() => setShowMovement(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-gold">Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
