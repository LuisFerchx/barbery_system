import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { catalogApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import { fmt } from '../utils/format'
import type { ServiceCatalog } from '../types'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { value: 'haircut', label: 'Corte' },
  { value: 'beard',   label: 'Barba' },
  { value: 'combo',   label: 'Combo' },
  { value: 'other',   label: 'Otro' },
]
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))

interface Form {
  name: string
  category: string
  price: string
}

const EMPTY: Form = { name: '', category: 'haircut', price: '' }

export default function Services() {
  const [services, setServices] = useState<ServiceCatalog[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ServiceCatalog | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    catalogApi.services()
      .then(r => setServices(r.data))
      .catch(() => toast.error('Error al cargar servicios'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setShowModal(true)
  }

  const openEdit = (s: ServiceCatalog) => {
    setEditing(s)
    setForm({ name: s.name, category: s.category, price: String(s.price) })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nombre requerido'); return }
    if (!form.price || parseFloat(form.price) <= 0) { toast.error('Precio requerido'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        price: parseFloat(form.price),
      }
      if (editing) {
        await catalogApi.updateService(editing.id, payload)
        toast.success('Servicio actualizado')
      } else {
        await catalogApi.createService(payload)
        toast.success('Servicio creado')
      }
      setShowModal(false)
      load()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (s: ServiceCatalog) => {
    try {
      await catalogApi.updateService(s.id, { is_active: !s.is_active })
      toast.success(s.is_active ? 'Servicio desactivado' : 'Servicio activado')
      load()
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const handleDelete = async (s: ServiceCatalog) => {
    if (!confirm(`¿Eliminar "${s.name}"?`)) return
    try {
      await catalogApi.deleteService(s.id)
      toast.success('Servicio eliminado')
      load()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const f = (k: keyof Form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value })),
  })

  const columns = [
    { key: 'name', label: 'Servicio', render: (v: string) => (
      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{v}</span>
    )},
    { key: 'category', label: 'Categoría', render: (v: string) => (
      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
        background: 'rgba(200,134,14,0.1)',
        color: 'var(--gold-400)',
        border: '1px solid rgba(200,134,14,0.2)',
      }}>
        {CAT_LABEL[v] || v}
      </span>
    )},
    { key: 'price', label: 'Precio', render: (v: number) => (
      <span className="font-semibold" style={{ color: 'var(--gold-400)' }}>{fmt.money(Number(v))}</span>
    )},
    { key: 'is_active', label: 'Estado', render: (v: boolean) => (
      <span className="text-xs font-medium" style={{ color: v ? '#4ade80' : '#f87171' }}>
        {v ? 'Activo' : 'Inactivo'}
      </span>
    )},
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Servicios</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Servicio
        </button>
      </div>

      <Table
        columns={columns}
        data={services}
        loading={loading}
        actions={row => {
          const s = row as ServiceCatalog
          return (
            <div className="flex gap-1">
              <button onClick={() => openEdit(s)} className="btn-icon" title="Editar">
                <Pencil size={14} />
              </button>
              <button onClick={() => handleToggle(s)} className="btn-icon" title={s.is_active ? 'Desactivar' : 'Activar'}
                style={{ color: s.is_active ? '#f87171' : '#4ade80' }}>
                {s.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              </button>
              <button onClick={() => handleDelete(s)} className="btn-icon text-red-400" title="Eliminar">
                <Trash2 size={14} />
              </button>
            </div>
          )
        }}
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Editar: ${editing.name}` : 'Nuevo Servicio'}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre *</label>
            <input className="input w-full" placeholder="Ej. Corte clásico" {...f('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Categoría</label>
              <select className="input w-full" {...f('category')}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Precio *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                <input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  className="input w-full pl-7"
                  {...f('price')}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
