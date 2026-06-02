import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight, Tag } from 'lucide-react'
import { serviceTypesApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import type { ServiceType } from '../types'
import toast from 'react-hot-toast'

interface Form {
  name: string
  description: string
}

const EMPTY: Form = { name: '', description: '' }

export default function ServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ServiceType | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    serviceTypesApi.list()
      .then(r => setServiceTypes(r.data))
      .catch(() => toast.error('Error al cargar tipos de servicio'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setShowModal(true)
  }

  const openEdit = (st: ServiceType) => {
    setEditing(st)
    setForm({ name: st.name, description: st.description || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nombre requerido'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
      }
      if (editing) {
        await serviceTypesApi.update(editing.id, payload)
        toast.success('Tipo actualizado')
      } else {
        await serviceTypesApi.create(payload)
        toast.success('Tipo creado')
      }
      setShowModal(false)
      load()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (st: ServiceType) => {
    try {
      await serviceTypesApi.update(st.id, { is_active: !st.is_active })
      toast.success(st.is_active ? 'Tipo desactivado' : 'Tipo activado')
      load()
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const f = (k: keyof Form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value })),
  })

  const columns = [
    {
      key: 'name', label: 'Tipo de Servicio', render: (v: string) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(200,134,14,0.1)', border: '1px solid rgba(200,134,14,0.2)' }}>
            <Tag size={12} style={{ color: 'var(--gold-400)' }} />
          </div>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{v}</span>
        </div>
      ),
    },
    {
      key: 'description', label: 'Descripción', render: (v: string | null) => (
        <span style={{ color: v ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{v || '—'}</span>
      ),
    },
    {
      key: 'is_active', label: 'Estado', render: (v: boolean) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            background: v ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
            color: v ? '#4ade80' : '#f87171',
            border: `1px solid ${v ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
          }}>
          {v ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Tipos de Servicio</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Categorías para organizar el catálogo de servicios y asignar a barberos
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Tipo
        </button>
      </div>

      <Table
        columns={columns}
        data={serviceTypes}
        loading={loading}
        emptyText="No hay tipos de servicio. Crea uno para organizar tu catálogo."
        actions={row => {
          const st = row as ServiceType
          return (
            <div className="flex gap-1">
              <button onClick={() => openEdit(st)} className="btn-icon" title="Editar">
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleToggle(st)}
                className="btn-icon"
                title={st.is_active ? 'Desactivar' : 'Activar'}
                style={{ color: st.is_active ? '#f87171' : '#4ade80' }}
              >
                {st.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              </button>
            </div>
          )
        }}
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Editar: ${editing.name}` : 'Nuevo Tipo de Servicio'}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre *</label>
            <input
              className="input w-full"
              placeholder="Ej. Corte de Cabello, Barba, Coloración"
              {...f('name')}
            />
          </div>
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Descripción</label>
            <textarea
              className="input w-full resize-none"
              rows={3}
              placeholder="Descripción breve del tipo de servicio (opcional)"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          {editing && (
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex-1">
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Estado actual</p>
                <p className="text-xs" style={{ color: editing.is_active ? '#4ade80' : '#f87171' }}>
                  {editing.is_active ? 'Activo' : 'Inactivo'}
                </p>
              </div>
              <button
                onClick={() => handleToggle(editing)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                {editing.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          )}
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
