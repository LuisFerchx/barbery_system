import { useState, useEffect, useCallback } from 'react'
import { Plus, Eye, Trash2, Pencil, UserCheck, UserX } from 'lucide-react'
import { clientsApi, salesApi } from '../services/api'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import PhoneInput, { splitPhone } from '../components/ui/PhoneInput'
import { fmt } from '../utils/format'
import type { Client, Sale } from '../types'
import toast from 'react-hot-toast'

interface ClientFormData {
  name: string
  lastname: string
  dialCode: string
  phone: string
  identification_number: string
  email: string
  notes: string
}

const EMPTY_FORM: ClientFormData = { name: '', lastname: '', dialCode: '+57', phone: '', identification_number: '', email: '', notes: '' }

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<Client | null>(null)
  const [clientSales, setClientSales] = useState<Sale[]>([])
  const [salesLoading, setSalesLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    clientsApi.list()
      .then(r => setClients(r.data))
      .catch(() => toast.error('Error al cargar clientes'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (c: Client) => {
    setEditing(c)
    const { dialCode, phone } = splitPhone(c.phone || '')
    setForm({ name: c.name, lastname: c.lastname, dialCode, phone, identification_number: c.identification_number || '', email: c.email || '', notes: c.notes || '' })
    setShowModal(true)
  }

  const openDetail = (c: Client) => {
    setDetail(c)
    setSalesLoading(true)
    salesApi.list({ client_id: c.id, page_size: 50 })
      .then(r => setClientSales(r.data.items))
      .catch(() => setClientSales([]))
      .finally(() => setSalesLoading(false))
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.lastname.trim()) {
      toast.error('Nombre y apellido requeridos')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        lastname: form.lastname.trim(),
        phone: form.phone.trim() ? (form.dialCode + form.phone.trim()) : null,
        identification_number: form.identification_number.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      }
      if (editing) {
        await clientsApi.update(editing.id, payload)
        toast.success('Cliente actualizado')
      } else {
        await clientsApi.create(payload)
        toast.success('Cliente creado')
      }
      setShowModal(false)
      load()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (c: Client) => {
    try {
      await clientsApi.update(c.id, { is_active: !c.is_active })
      toast.success(c.is_active ? 'Cliente desactivado' : 'Cliente activado')
      load()
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const handleDelete = async (c: Client) => {
    if (!confirm(`¿Eliminar cliente ${c.name} ${c.lastname}?`)) return
    try {
      await clientsApi.delete(c.id)
      toast.success('Cliente eliminado')
      load()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const filtered = clients.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return `${c.name} ${c.lastname}`.toLowerCase().includes(q) ||
      c.phone?.includes(q) || c.email?.toLowerCase().includes(q) ||
      c.identification_number?.toLowerCase().includes(q)
  })

  const columns = [
    { key: 'name', label: 'Nombre', render: (_: string, row: unknown) => {
      const c = row as Client
      return (
        <div>
          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{c.name} {c.lastname}</p>
          {c.phone && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.phone}</p>}
          {c.identification_number && (
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>ID: {c.identification_number}</p>
          )}
        </div>
      )
    }},
    { key: 'identification_number', label: 'Identificación', render: (v: string | null) => (
      v
        ? <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{v}</span>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>
    )},
    { key: 'total_sales', label: 'Visitas', render: (v: number) => (
      <span className="font-mono text-sm" style={{ color: 'var(--gold-400)' }}>{v ?? 0}</span>
    )},
    { key: 'created_at', label: 'Registro', render: (v: string) => fmt.date(v) },
    { key: 'is_active', label: 'Estado', render: (v: boolean) => (
      <span className="text-xs font-medium" style={{ color: v ? '#4ade80' : '#f87171' }}>
        {v ? 'Activo' : 'Inactivo'}
      </span>
    )},
  ]

  const f = (k: keyof ClientFormData) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value })),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Clientes</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="card mb-4 flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-48">
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Buscar</label>
          <input
            type="text"
            placeholder="Nombre, teléfono, email, # identificación..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-full"
          />
        </div>
        <span className="text-xs pb-2" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} clientes
        </span>
      </div>

      <Table
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={row => openDetail(row as Client)}
        actions={row => {
          const c = row as Client
          return (
            <div className="flex gap-1">
              <button onClick={e => { e.stopPropagation(); openDetail(c) }} className="btn-icon" title="Ver detalle">
                <Eye size={14} />
              </button>
              <button onClick={e => { e.stopPropagation(); openEdit(c) }} className="btn-icon" title="Editar">
                <Pencil size={14} />
              </button>
              <button onClick={e => { e.stopPropagation(); handleToggle(c) }} className="btn-icon" title={c.is_active ? 'Desactivar' : 'Activar'}>
                {c.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
              </button>
              <button onClick={e => { e.stopPropagation(); handleDelete(c) }} className="btn-icon text-red-400" title="Eliminar">
                <Trash2 size={14} />
              </button>
            </div>
          )
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Editar: ${editing.name} ${editing.lastname}` : 'Nuevo Cliente'}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Nombre *</label>
              <input className="input w-full" placeholder="Juan" {...f('name')} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Apellido *</label>
              <input className="input w-full" placeholder="García" {...f('lastname')} />
            </div>
          </div>
          <PhoneInput
            dialCode={form.dialCode}
            phone={form.phone}
            onDialCodeChange={v => setForm(prev => ({ ...prev, dialCode: v }))}
            onPhoneChange={v => setForm(prev => ({ ...prev, phone: v }))}
          />
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}># Identificación</label>
            <input className="input w-full" placeholder="1234567890" {...f('identification_number')} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Email</label>
            <input className="input w-full" type="email" placeholder="correo@ejemplo.com" {...f('email')} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Notas</label>
            <textarea className="input w-full resize-none" rows={2} placeholder="Preferencias, alergias..." {...f('notes')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.name} ${detail.lastname}` : ''}
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Teléfono</p>
                <p style={{ color: 'var(--text-primary)' }}>{detail.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Email</p>
                <p style={{ color: 'var(--text-primary)' }}>{detail.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}># Identificación</p>
                <p className="font-mono" style={{ color: 'var(--text-primary)' }}>{detail.identification_number || '—'}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Registro</p>
                <p style={{ color: 'var(--text-primary)' }}>{fmt.date(detail.created_at)}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total visitas</p>
                <p className="font-semibold" style={{ color: 'var(--gold-400)' }}>{detail.total_sales ?? 0}</p>
              </div>
            </div>

            {detail.notes && (
              <p className="text-sm p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                {detail.notes}
              </p>
            )}

            <div>
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Historial de visitas
              </h4>
              {salesLoading ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cargando...</p>
              ) : clientSales.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin visitas registradas</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {clientSales.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div>
                        <span className="font-mono text-xs font-semibold mr-2" style={{ color: 'var(--gold-400)' }}>{s.number}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{fmt.date(s.date)}</span>
                      </div>
                      <div className="text-right">
                        <p style={{ color: 'var(--text-primary)' }}>{s.service_name}</p>
                        <p className="text-xs" style={{ color: '#4ade80' }}>{fmt.money(Number(s.real_income))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
