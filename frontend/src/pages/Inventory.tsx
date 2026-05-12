import { useState, useEffect, useCallback } from 'react'
import { Plus, ArrowDown, AlertTriangle, Pencil } from 'lucide-react'
import { inventoryApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import { fmt } from '../utils/format'
import type { InventoryItem } from '../types'
import toast from 'react-hot-toast'

type Tab = 'merchandise' | 'courtesy'

interface ItemForm {
  name: string
  category: Tab
  unit: string
  stock_current: string
  stock_minimum: string
  cost_per_unit: string
}

interface MovForm {
  movement_type: 'in' | 'out' | 'adjustment'
  quantity: string
  reason: string
}

const EMPTY_ITEM = (tab: Tab): ItemForm => ({
  name: '', category: tab, unit: 'unidad', stock_current: '0', stock_minimum: '5', cost_per_unit: '0',
})

const EMPTY_MOV: MovForm = { movement_type: 'in', quantity: '1', reason: '' }

export default function Inventory() {
  const [tab, setTab] = useState<Tab>('merchandise')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM('merchandise'))
  const [savingItem, setSavingItem] = useState(false)
  const [showMovModal, setShowMovModal] = useState(false)
  const [movItem, setMovItem] = useState<InventoryItem | null>(null)
  const [movForm, setMovForm] = useState<MovForm>(EMPTY_MOV)
  const [savingMov, setSavingMov] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    inventoryApi.list(tab)
      .then(r => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Error al cargar inventario'))
      .finally(() => setLoading(false))
  }, [tab])

  useEffect(() => { load() }, [load])

  const openCreateItem = () => {
    setEditingItem(null)
    setItemForm(EMPTY_ITEM(tab))
    setShowItemModal(true)
  }

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      category: item.category as Tab,
      unit: item.unit,
      stock_current: String(item.stock_current),
      stock_minimum: String(item.stock_minimum),
      cost_per_unit: String(item.cost_per_unit),
    })
    setShowItemModal(true)
  }

  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) { toast.error('Nombre requerido'); return }
    setSavingItem(true)
    try {
      const payload = {
        name: itemForm.name.trim(),
        category: itemForm.category,
        unit: itemForm.unit.trim() || 'unidad',
        stock_current: parseFloat(itemForm.stock_current) || 0,
        stock_minimum: parseFloat(itemForm.stock_minimum) || 0,
        cost_per_unit: parseFloat(itemForm.cost_per_unit) || 0,
      }
      if (editingItem) {
        await inventoryApi.update(editingItem.id, payload)
        toast.success('Item actualizado')
      } else {
        await inventoryApi.create(payload)
        toast.success('Item creado')
      }
      setShowItemModal(false)
      load()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSavingItem(false)
    }
  }

  const openMovModal = (item: InventoryItem) => {
    setMovItem(item)
    setMovForm(EMPTY_MOV)
    setShowMovModal(true)
  }

  const handleSaveMov = async () => {
    if (!movForm.quantity || parseInt(movForm.quantity) <= 0) { toast.error('Cantidad inválida'); return }
    setSavingMov(true)
    try {
      await inventoryApi.addMovement(movItem!.id, {
        movement_type: movForm.movement_type,
        quantity: parseInt(movForm.quantity),
        reason: movForm.reason.trim() || null,
      })
      toast.success('Movimiento registrado')
      setShowMovModal(false)
      load()
    } catch {
      toast.error('Error al registrar movimiento')
    } finally {
      setSavingMov(false)
    }
  }

  const ifk = (k: keyof ItemForm) => ({
    value: itemForm[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setItemForm(prev => ({ ...prev, [k]: e.target.value })),
  })

  const columns = tab === 'merchandise' ? [
    { key: 'name', label: 'Producto' },
    { key: 'unit', label: 'Unidad' },
    { key: 'stock_current', label: 'Stock', render: (v: number, row: InventoryItem) => (
      <span className="font-medium flex items-center gap-1.5" style={{ color: v <= row.stock_minimum ? '#f87171' : 'var(--text-primary)' }}>
        {v <= row.stock_minimum && <AlertTriangle size={12} />}
        {v}
      </span>
    )},
    { key: 'stock_minimum', label: 'Mín.' },
    { key: 'cost_per_unit', label: 'Costo', render: (v: number) => fmt.money(Number(v)) },
  ] : [
    { key: 'name', label: 'Bebida' },
    { key: 'unit', label: 'Unidad' },
    { key: 'stock_current', label: 'Stock actual', render: (v: number, row: InventoryItem) => (
      <span className="font-medium flex items-center gap-1.5" style={{ color: v <= row.stock_minimum ? '#f87171' : '#4ade80' }}>
        {v <= row.stock_minimum && <AlertTriangle size={12} />}
        {v}
      </span>
    )},
    { key: 'stock_minimum', label: 'Resurtir al llegar a' },
    { key: 'cost_per_unit', label: 'Costo unitario', render: (v: number) => fmt.money(Number(v)) },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Inventario</h1>
        <button onClick={openCreateItem} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Item
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['merchandise', 'courtesy'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? 'btn-primary text-xs px-4 py-2' : 'btn-secondary text-xs px-4 py-2'}
          >
            {t === 'merchandise' ? 'Mercancía' : 'Bebidas de Cortesía'}
          </button>
        ))}
      </div>

      <Table
        columns={columns}
        data={items}
        loading={loading}
        actions={row => {
          const item = row as InventoryItem
          return (
            <div className="flex gap-1">
              <button
                onClick={e => { e.stopPropagation(); openMovModal(item) }}
                className="btn-icon"
                title="Entrada de stock"
                style={{ color: '#4ade80' }}
              >
                <ArrowDown size={14} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); openEditItem(item) }}
                className="btn-icon"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
            </div>
          )
        }}
      />

      <Modal
        open={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItem ? 'Editar Item' : `Nuevo Item — ${tab === 'merchandise' ? 'Mercancía' : 'Cortesía'}`}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Nombre</label>
            <input className="input w-full" placeholder="Nombre del producto" {...ifk('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Unidad</label>
              <input className="input w-full" placeholder="unidad, ml, kg..." {...ifk('unit')} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Costo unitario</label>
              <input type="number" step="0.01" min="0" className="input w-full" placeholder="0.00" {...ifk('cost_per_unit')} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Stock inicial</label>
              <input type="number" min="0" className="input w-full" {...ifk('stock_current')} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Stock mínimo</label>
              <input type="number" min="0" className="input w-full" {...ifk('stock_minimum')} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowItemModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSaveItem} disabled={savingItem} className="btn-primary flex-1">
              {savingItem ? 'Guardando...' : editingItem ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showMovModal}
        onClose={() => setShowMovModal(false)}
        title={`Movimiento — ${movItem?.name || ''}`}
        size="sm"
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Tipo</label>
            <select
              className="input w-full"
              value={movForm.movement_type}
              onChange={e => setMovForm(prev => ({ ...prev, movement_type: e.target.value as MovForm['movement_type'] }))}
            >
              <option value="in">Entrada</option>
              <option value="out">Salida</option>
              <option value="adjustment">Ajuste</option>
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Cantidad</label>
            <input
              type="number" min="1" className="input w-full"
              value={movForm.quantity}
              onChange={e => setMovForm(prev => ({ ...prev, quantity: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Motivo</label>
            <input
              className="input w-full" placeholder="Motivo del movimiento..."
              value={movForm.reason}
              onChange={e => setMovForm(prev => ({ ...prev, reason: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowMovModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSaveMov} disabled={savingMov} className="btn-primary flex-1">
              {savingMov ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
