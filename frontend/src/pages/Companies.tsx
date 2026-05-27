import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Building2, CheckCircle, XCircle, UserPlus } from 'lucide-react'
import { companiesApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import PhoneInput, { splitPhone } from '../components/ui/PhoneInput'
import type { Company } from '../types'
import toast from 'react-hot-toast'

const EMPTY_FORM = { name: '', slug: '', dialCode: '+57', phone: '', address: '', is_active: true, commission_by_service: false }
const EMPTY_ADMIN = { username: '', password: '', full_name: '', email: '' }

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN)
  const [createAdmin, setCreateAdmin] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    companiesApi.list().then(r => setCompanies(r.data))
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setAdminForm(EMPTY_ADMIN)
    setCreateAdmin(false)
    setShowModal(true)
  }

  const openEdit = (c: Company) => {
    setEditing(c)
    const { dialCode, phone } = splitPhone(c.phone || '')
    setForm({ name: c.name, slug: c.slug, dialCode, phone, address: c.address || '', is_active: c.is_active, commission_by_service: c.commission_by_service })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error('Nombre y slug requeridos'); return }
    if (createAdmin && (!adminForm.username || !adminForm.password)) {
      toast.error('Usuario y contraseña del administrador son requeridos')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await companiesApi.update(editing.id, {
          name: form.name,
          slug: form.slug,
          phone: form.phone ? (form.dialCode + form.phone) : null,
          address: form.address || null,
          is_active: form.is_active,
          commission_by_service: form.commission_by_service,
        })
        toast.success('Empresa actualizada')
      } else {
        await companiesApi.setup({
          name: form.name,
          slug: form.slug,
          phone: form.phone ? (form.dialCode + form.phone) : undefined,
          address: form.address || undefined,
          commission_by_service: form.commission_by_service,
          admin: createAdmin
            ? { ...adminForm, role: 'admin' }
            : undefined,
        })
        toast.success(createAdmin
          ? `Empresa y administrador '${adminForm.username}' creados`
          : 'Empresa creada'
        )
      }
      setShowModal(false)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (c: Company) => {
    try {
      await companiesApi.update(c.id, { is_active: !c.is_active })
      load()
    } catch { toast.error('Error') }
  }

  const f = (k: keyof typeof form) => ({
    value: String(form[k]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value
      setForm(prev => {
        const next = { ...prev, [k]: value }
        if (k === 'name' && !editing) next.slug = slugify(e.target.value)
        return next
      })
    },
  })

  const af = (k: keyof typeof adminForm) => ({
    value: adminForm[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setAdminForm(prev => ({ ...prev, [k]: e.target.value })),
  })

  const columns = [
    {
      key: 'name', label: 'Empresa',
      render: (v: string, row: Company) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,134,14,0.15)' }}>
            <Building2 size={14} style={{ color: 'var(--gold-400)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{v}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{row.slug}</p>
          </div>
        </div>
      )
    },
    { key: 'phone', label: 'Teléfono', render: (v: string) => v || <span style={{ color: 'var(--text-muted)' }}>—</span> },
    { key: 'address', label: 'Dirección', render: (v: string) => v || <span style={{ color: 'var(--text-muted)' }}>—</span> },
    {
      key: 'is_active', label: 'Estado',
      render: (v: boolean, row: Company) => (
        <button
          onClick={() => handleToggleActive(row)}
          className="flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          style={{ color: v ? '#4ade80' : '#f87171' }}
        >
          {v ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {v ? 'Activa' : 'Inactiva'}
        </button>
      )
    },
    {
      key: 'id', label: '',
      render: (_: unknown, row: Company) => (
        <button onClick={() => openEdit(row)} className="btn-icon">
          <Pencil size={14} />
        </button>
      )
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Empresas</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Gestión de empresas del sistema</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nueva Empresa
        </button>
      </div>

      <Table columns={columns} data={companies} />

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Empresa' : 'Nueva Empresa'} size={!editing ? 'lg' : 'md'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre *</label>
            <input className="input w-full" {...f('name')} placeholder="Barbería El Corte" />
          </div>
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Slug *</label>
            <input className="input w-full font-mono" {...f('slug')} placeholder="barberia-el-corte" />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Identificador único, auto-generado del nombre</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PhoneInput
              dialCode={form.dialCode}
              phone={form.phone}
              onDialCodeChange={v => setForm(prev => ({ ...prev, dialCode: v }))}
              onPhoneChange={v => setForm(prev => ({ ...prev, phone: v }))}
            />
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Dirección</label>
              <input className="input w-full" {...f('address')} placeholder="Calle Principal 123" />
            </div>
          </div>

          {!editing && (
            <>
              <div
                className="flex items-center gap-3 py-3"
                style={{ borderTop: '1px solid var(--surface-border)' }}
              >
                <input
                  type="checkbox"
                  id="create_admin"
                  checked={createAdmin}
                  onChange={e => setCreateAdmin(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor="create_admin"
                  className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none"
                  style={{ color: createAdmin ? 'var(--gold-400)' : 'var(--text-secondary)' }}
                >
                  <UserPlus size={14} />
                  Crear administrador para esta empresa
                </label>
              </div>

              {createAdmin && (
                <div className="space-y-3 rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid rgba(200,134,14,0.15)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--gold-400)' }}>
                    Administrador de la empresa
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Usuario *</label>
                      <input className="input w-full" placeholder="admin_barberia" {...af('username')} />
                    </div>
                    <div>
                      <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Contraseña *</label>
                      <input type="password" className="input w-full" placeholder="••••••••" {...af('password')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre completo</label>
                      <input className="input w-full" placeholder="María García" {...af('full_name')} />
                    </div>
                    <div>
                      <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
                      <input type="email" className="input w-full" placeholder="admin@empresa.com" {...af('email')} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {editing && (
            <div className="space-y-3" style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '0.75rem' }}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="is_active" className="text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>Empresa activa</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="commission_by_service"
                  checked={form.commission_by_service}
                  onChange={e => setForm(prev => ({ ...prev, commission_by_service: e.target.checked }))}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="commission_by_service" className="text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                  Comisión por servicio <span style={{ opacity: 0.7 }}>(usa comisión del catálogo en lugar del barbero)</span>
                </label>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
