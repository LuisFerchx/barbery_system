import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Clock } from 'lucide-react'
import { catalogApi, serviceTypesApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import { fmt } from '../utils/format'
import type { ServiceCatalog, ServiceType } from '../types'
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
  service_type_id: string
  price: string
  commission_rate: string
  duration: string
}

const EMPTY: Form = { name: '', category: 'haircut', service_type_id: '', price: '', commission_rate: '', duration: '' }

export default function Services() {
  const [services, setServices] = useState<ServiceCatalog[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ServiceCatalog | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      catalogApi.services(),
      serviceTypesApi.list({ active_only: true }),
    ])
      .then(([svcRes, stRes]) => {
        setServices(svcRes.data)
        setServiceTypes(stRes.data)
      })
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
    setForm({
      name: s.name,
      category: s.category,
      service_type_id: s.service_type_id != null ? String(s.service_type_id) : '',
      price: String(s.price),
      commission_rate: s.commission_rate != null ? String(Math.round(Number(s.commission_rate) * 100)) : '',
      duration: s.duration != null ? String(s.duration) : '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nombre requerido'); return }
    if (!form.price || parseFloat(form.price) <= 0) { toast.error('Precio requerido'); return }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        category: form.category,
        service_type_id: form.service_type_id !== '' ? parseInt(form.service_type_id) : null,
        price: parseFloat(form.price),
        commission_rate: form.commission_rate !== '' ? parseFloat(form.commission_rate) / 100 : null,
        duration: form.duration !== '' ? parseInt(form.duration) : null,
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
    { key: 'service_type', label: 'Tipo', render: (_: unknown, row: ServiceCatalog) => (
      row.service_type
        ? <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
            background: 'rgba(96,165,250,0.1)',
            color: '#60a5fa',
            border: '1px solid rgba(96,165,250,0.2)',
          }}>{row.service_type.name}</span>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>
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
    { key: 'commission_rate', label: 'Comisión', render: (v: number | null) => (
      v != null
        ? <span className="text-xs font-medium" style={{ color: 'var(--gold-400)' }}>{(Number(v) * 100).toFixed(0)}%</span>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>
    )},
    { key: 'duration', label: 'Duración', render: (v: number | null) => (
      v != null
        ? <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Clock size={11} />{v} min
          </span>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>
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
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Tipo de Servicio</label>
            <select className="input w-full" {...f('service_type_id')}>
              <option value="">— Sin tipo asignado</option>
              {serviceTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Comisión del servicio <span style={{ opacity: 0.6 }}>(%)</span>
              </label>
              <input
                type="number" min="0" max="100" step="1"
                className="input w-full"
                placeholder="— usa comisión del barbero"
                {...f('commission_rate')}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Vacío = usa comisión del barbero</p>
            </div>
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Duración <span style={{ opacity: 0.6 }}>(min)</span>
              </label>
              <input
                type="number" min="1" step="1"
                className="input w-full"
                placeholder="— sin definir"
                {...f('duration')}
              />
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
