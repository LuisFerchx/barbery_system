import { useState, useEffect } from 'react'
import { Plus, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react'
import { inventoryApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import type { InventoryItem } from '../types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const emptyForm = { name: '', category: 'bebida', unit: 'unidad', stock_current: '0', low_stock_alert: '5', cost_price: '0', sale_price: '0' }

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showMovement, setShowMovement] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [movForm, setMovForm] = useState({ movement_type: 'entrada', quantity: '1', reason: '' })
  const [category, setCategory] = useState('')

  const fetch = () => inventoryApi.list(category || undefined).then(r => setItems(r.data))
  useEffect(() => { fetch() }, [category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, stock_current: Number(form.stock_current), low_stock_alert: Number(form.low_stock_alert), cost_price: Number(form.cost_price), sale_price: Number(form.sale_price) }
    await inventoryApi.create(payload)
    toast.success('Item creado')
    setShowModal(false)
    fetch()
  }

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return
    await inventoryApi.addMovement(selectedItem.id, { ...movForm, quantity: Number(movForm.quantity) })
    toast.success('Movimiento registrado')
    setShowMovement(false)
    fetch()
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    { key: 'name', header: 'Producto' },
    { key: 'category', header: 'Categoría' },
    {
      key: 'stock_current', header: 'Stock', render: (r: InventoryItem) => (
        <span className={clsx('font-medium', r.stock_current <= r.low_stock_alert ? 'text-red-600' : 'text-gray-800')}>
          {r.stock_current <= r.low_stock_alert && <AlertTriangle size={12} className="inline mr-1" />}
          {r.stock_current} {r.unit}
        </span>
      )
    },
    { key: 'low_stock_alert', header: 'Alerta mín.' },
    { key: 'actions', header: '', render: (r: InventoryItem) => (
      <div className="flex gap-2">
        <button onClick={() => { setSelectedItem(r); setMovForm({ movement_type: 'entrada', quantity: '1', reason: '' }); setShowMovement(true) }}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">
          <ArrowDown size={12} /> Entrada
        </button>
        <button onClick={() => { setSelectedItem(r); setMovForm({ movement_type: 'salida', quantity: '1', reason: '' }); setShowMovement(true) }}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">
          <ArrowUp size={12} /> Salida
        </button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          {['', 'bebida', 'producto', 'insumo'].map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={clsx('px-3 py-1.5 text-xs rounded-lg font-medium', category === cat ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}>
              {cat || 'Todos'}
            </button>
          ))}
        </div>
        <button onClick={() => { setForm(emptyForm); setShowModal(true) }} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
          <Plus size={16} /> Nuevo item
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <Table columns={columns} data={items} />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo item de inventario">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="bebida">Bebida</option>
                <option value="producto">Producto</option>
                <option value="insumo">Insumo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
              <input value={form.unit} onChange={e => set('unit', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stock inicial</label>
              <input type="number" value={form.stock_current} onChange={e => set('stock_current', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Alerta mínimo</label>
              <input type="number" value={form.low_stock_alert} onChange={e => set('low_stock_alert', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal open={showMovement} onClose={() => setShowMovement(false)} title={`Movimiento - ${selectedItem?.name || ''}`} size="sm">
        <form onSubmit={handleMovement} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
            <select value={movForm.movement_type} onChange={e => setMovForm(f => ({ ...f, movement_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
            <input type="number" min="1" value={movForm.quantity} onChange={e => setMovForm(f => ({ ...f, quantity: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label>
            <input value={movForm.reason} onChange={e => setMovForm(f => ({ ...f, reason: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowMovement(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600">Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
