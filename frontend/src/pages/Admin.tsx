import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { usersApi, barbersApi, catalogApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import PhoneInput, { splitPhone } from '../components/ui/PhoneInput'
import { fmt } from '../utils/format'
import type { User, Barber, ServiceCatalog, ProductCatalog } from '../types'
import toast from 'react-hot-toast'

type Tab = 'users' | 'barbers' | 'catalog'

// ────────── Users ──────────
const EMPTY_USER = { username: '', full_name: '', email: '', role: 'barber', password: '' }

function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_USER)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => { usersApi.list().then(r => setUsers(r.data)) }, [])
  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.username || !form.password) { toast.error('Usuario y contraseña requeridos'); return }
    setSaving(true)
    try {
      await usersApi.create(form)
      toast.success('Usuario creado')
      setShowModal(false)
      load()
    } catch { toast.error('Error al crear usuario') }
    finally { setSaving(false) }
  }

  const handleDelete = async (u: User) => {
    if (!confirm(`¿Eliminar usuario ${u.username}?`)) return
    try { await usersApi.delete(u.id); toast.success('Eliminado'); load() }
    catch { toast.error('Error al eliminar') }
  }

  const handleToggle = async (u: User) => {
    try { await usersApi.update(u.id, { is_active: !u.is_active }); load() }
    catch { toast.error('Error') }
  }

  const f = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value })),
  })

  const columns = [
    { key: 'username', label: 'Usuario', render: (v: string) => <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{v}</span> },
    { key: 'full_name', label: 'Nombre' },
    { key: 'role', label: 'Rol', render: (v: string) => (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
        background: v === 'admin' ? 'rgba(200,134,14,0.15)' : v === 'manager' ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.08)',
        color: v === 'admin' ? 'var(--gold-400)' : v === 'manager' ? '#60a5fa' : 'var(--text-muted)',
      }}>{v}</span>
    )},
    { key: 'is_active', label: 'Estado', render: (v: boolean) => (
      <span style={{ color: v ? '#4ade80' : '#f87171' }} className="text-xs">{v ? 'Activo' : 'Inactivo'}</span>
    )},
  ]

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm(EMPTY_USER); setShowModal(true) }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>
      <Table
        columns={columns}
        data={users}
        actions={row => {
          const u = row as User
          return (
            <div className="flex gap-1">
              <button onClick={() => handleToggle(u)} className="btn-icon text-xs" title={u.is_active ? 'Desactivar' : 'Activar'}>
                {u.is_active ? '✗' : '✓'}
              </button>
              <button onClick={() => handleDelete(u)} className="btn-icon text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          )
        }}
      />
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo Usuario">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Usuario *</label>
              <input className="input w-full" {...f('username')} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Nombre completo</label>
              <input className="input w-full" {...f('full_name')} />
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Email</label>
            <input type="email" className="input w-full" {...f('email')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Rol</label>
              <select className="input w-full" {...f('role')}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="barber">Barbero</option>
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Contraseña *</label>
              <input type="password" className="input w-full" {...f('password')} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ────────── Barbers ──────────
const EMPTY_BARBER = { name: '', lastname: '', dialCode: '+57', phone: '', commission_rate: '40' }

function BarbersTab() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Barber | null>(null)
  const [form, setForm] = useState(EMPTY_BARBER)
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const load = useCallback(() => { barbersApi.list().then(r => setBarbers(r.data)) }, [])
  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_BARBER)
    setPhotoFile(null)
    setPhotoPreview(null)
    setShowModal(true)
  }
  const openEdit = (b: Barber) => {
    setEditing(b)
    const { dialCode, phone } = splitPhone(b.phone || '')
    setForm({ name: b.name, lastname: b.lastname, dialCode, phone, commission_rate: String((Number(b.commission_rate) * 100).toFixed(0)) })
    setPhotoFile(null)
    setPhotoPreview(b.photo_url || null)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.lastname.trim()) { toast.error('Nombre requerido'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        lastname: form.lastname.trim(),
        phone: form.phone.trim() ? (form.dialCode + form.phone.trim()) : null,
        commission_rate: (parseFloat(form.commission_rate) || 40) / 100,
      }
      if (editing) {
        await barbersApi.update(editing.id, payload)
        toast.success('Barbero actualizado')
      } else {
        const res = await barbersApi.create(payload)
        if (photoFile) {
          const fd = new FormData()
          fd.append('file', photoFile)
          await barbersApi.uploadPhoto((res.data as Barber).id, fd)
        }
        toast.success('Barbero creado')
      }
      setShowModal(false); load()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const handleToggle = async (b: Barber) => {
    try { await barbersApi.update(b.id, { is_active: !b.is_active }); load() }
    catch { toast.error('Error') }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleUploadPhoto = async () => {
    if (!editing || !photoFile) return
    setUploadingPhoto(true)
    try {
      const form = new FormData()
      form.append('file', photoFile)
      await barbersApi.uploadPhoto(editing.id, form)
      toast.success('Foto actualizada')
      setPhotoFile(null)
      load()
    } catch { toast.error('Error al subir foto') }
    finally { setUploadingPhoto(false) }
  }

  const f = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [k]: e.target.value })),
  })

  const columns = [
    {
      key: 'photo_url',
      label: '',
      render: (_: string | null, row: Barber) => row.photo_url ? (
        <img src={row.photo_url!} alt={row.name} className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
          {row.name.charAt(0)}{row.lastname.charAt(0)}
        </div>
      ),
    },
    { key: 'name', label: 'Nombre', render: (_: string, row: Barber) => `${row.name} ${row.lastname}` },
    { key: 'phone', label: 'Teléfono', render: (v: string | null) => v || '—' },
    { key: 'commission_rate', label: 'Comisión', render: (v: number) => `${(Number(v) * 100).toFixed(0)}%` },
    { key: 'is_active', label: 'Estado', render: (v: boolean) => (
      <span style={{ color: v ? '#4ade80' : '#f87171' }} className="text-xs">{v ? 'Activo' : 'Inactivo'}</span>
    )},
  ]

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Barbero
        </button>
      </div>
      <Table
        columns={columns}
        data={barbers}
        actions={row => {
          const b = row as Barber
          return (
            <div className="flex gap-1">
              <button onClick={() => openEdit(b)} className="btn-icon"><Pencil size={14} /></button>
              <button onClick={() => handleToggle(b)} className="btn-icon text-xs" title={b.is_active ? 'Desactivar' : 'Activar'}>
                {b.is_active ? '✗' : '✓'}
              </button>
            </div>
          )
        }}
      />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Barbero' : 'Nuevo Barbero'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Nombre *</label>
              <input className="input w-full" {...f('name')} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Apellido *</label>
              <input className="input w-full" {...f('lastname')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PhoneInput
              dialCode={form.dialCode}
              phone={form.phone}
              onDialCodeChange={v => setForm(prev => ({ ...prev, dialCode: v }))}
              onPhoneChange={v => setForm(prev => ({ ...prev, phone: v }))}
            />
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Comisión (%)</label>
              <div className="flex items-center gap-1">
                <input type="number" min="0" max="100" className="input w-full" {...f('commission_rate')} />
                <span style={{ color: 'var(--text-muted)' }}>%</span>
              </div>
            </div>
          </div>
          <div className="pt-1">
            <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Foto de perfil</label>
            <div className="flex items-center gap-3">
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                  {form.name.charAt(0)}{form.lastname.charAt(0)}
                </div>
              )}
              <div className="flex-1 flex gap-2">
                <label className="btn-secondary text-xs cursor-pointer flex-1 text-center py-2">
                  Elegir foto
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
                {editing && photoFile && (
                  <button onClick={handleUploadPhoto} disabled={uploadingPhoto} className="btn-primary text-xs px-3">
                    {uploadingPhoto ? '...' : 'Subir'}
                  </button>
                )}
              </div>
            </div>
            {!editing && photoFile && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                La foto se subirá al crear el barbero.
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
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

// ────────── Catalog ──────────
const SERVICE_CATEGORIES = [
  { value: 'haircut', label: 'Corte' },
  { value: 'beard', label: 'Barba' },
  { value: 'combo', label: 'Combo' },
  { value: 'other', label: 'Otro' },
]

const EMPTY_SVC = { name: '', category: 'haircut', price: '' }
const EMPTY_PRD = { name: '', brand: '', cost_price: '', sale_price: '' }

function CatalogTab() {
  const [services, setServices] = useState<ServiceCatalog[]>([])
  const [products, setProducts] = useState<ProductCatalog[]>([])
  const [showSvcModal, setShowSvcModal] = useState(false)
  const [editingSvc, setEditingSvc] = useState<ServiceCatalog | null>(null)
  const [svcForm, setSvcForm] = useState(EMPTY_SVC)
  const [showPrdModal, setShowPrdModal] = useState(false)
  const [editingPrd, setEditingPrd] = useState<ProductCatalog | null>(null)
  const [prdForm, setPrdForm] = useState(EMPTY_PRD)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    Promise.all([catalogApi.services(), catalogApi.products()])
      .then(([s, p]) => { setServices(s.data); setProducts(p.data) })
  }, [])
  useEffect(() => { load() }, [load])

  // Services
  const openSvc = (s?: ServiceCatalog) => {
    setEditingSvc(s || null)
    setSvcForm(s ? { name: s.name, category: s.category, price: String(s.price) } : EMPTY_SVC)
    setShowSvcModal(true)
  }

  const handleSaveSvc = async () => {
    if (!svcForm.name || !svcForm.price) { toast.error('Nombre y precio requeridos'); return }
    setSaving(true)
    try {
      const payload = { name: svcForm.name.trim(), category: svcForm.category, price: parseFloat(svcForm.price) }
      if (editingSvc) { await catalogApi.updateService(editingSvc.id, payload); toast.success('Servicio actualizado') }
      else { await catalogApi.createService(payload); toast.success('Servicio creado') }
      setShowSvcModal(false); load()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const deleteSvc = async (id: number) => {
    if (!confirm('¿Eliminar servicio?')) return
    try { await catalogApi.deleteService(id); toast.success('Eliminado'); load() }
    catch { toast.error('Error') }
  }

  // Products
  const openPrd = (p?: ProductCatalog) => {
    setEditingPrd(p || null)
    setPrdForm(p ? { name: p.name, brand: p.brand || '', cost_price: String(p.cost_price), sale_price: String(p.sale_price) } : EMPTY_PRD)
    setShowPrdModal(true)
  }

  const handleSavePrd = async () => {
    if (!prdForm.name || !prdForm.sale_price) { toast.error('Nombre y precio de venta requeridos'); return }
    setSaving(true)
    try {
      const payload = {
        name: prdForm.name.trim(),
        brand: prdForm.brand.trim() || null,
        cost_price: parseFloat(prdForm.cost_price) || 0,
        sale_price: parseFloat(prdForm.sale_price),
      }
      if (editingPrd) { await catalogApi.updateProduct(editingPrd.id, payload); toast.success('Producto actualizado') }
      else { await catalogApi.createProduct(payload); toast.success('Producto creado') }
      setShowPrdModal(false); load()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const deletePrd = async (id: number) => {
    if (!confirm('¿Eliminar producto?')) return
    try { await catalogApi.deleteProduct(id); toast.success('Eliminado'); load() }
    catch { toast.error('Error') }
  }

  const svcColumns = [
    { key: 'name', label: 'Servicio' },
    { key: 'category', label: 'Categoría', render: (v: string) => SERVICE_CATEGORIES.find(c => c.value === v)?.label || v },
    { key: 'price', label: 'Precio', render: (v: number) => fmt.money(Number(v)) },
    { key: 'is_active', label: 'Estado', render: (v: boolean) => (
      <span style={{ color: v ? '#4ade80' : '#f87171' }} className="text-xs">{v ? 'Activo' : 'Inactivo'}</span>
    )},
  ]

  const prdColumns = [
    { key: 'name', label: 'Producto' },
    { key: 'brand', label: 'Marca', render: (v: string | null) => v || '—' },
    { key: 'cost_price', label: 'Costo', render: (v: number) => fmt.money(Number(v)) },
    { key: 'sale_price', label: 'P. Venta', render: (v: number) => fmt.money(Number(v)) },
  ]

  const sf = (k: keyof typeof svcForm) => ({
    value: svcForm[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setSvcForm(p => ({ ...p, [k]: e.target.value })),
  })

  const pf = (k: keyof typeof prdForm) => ({
    value: prdForm[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPrdForm(p => ({ ...p, [k]: e.target.value })),
  })

  return (
    <div className="space-y-6">
      {/* Services */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Servicios</h3>
          <button onClick={() => openSvc()} className="btn-primary flex items-center gap-2 text-xs px-3 py-1.5">
            <Plus size={14} /> Nuevo Servicio
          </button>
        </div>
        <Table
          columns={svcColumns}
          data={services}
          actions={row => {
            const s = row as ServiceCatalog
            return (
              <div className="flex gap-1">
                <button onClick={() => openSvc(s)} className="btn-icon"><Pencil size={14} /></button>
                <button onClick={() => deleteSvc(s.id)} className="btn-icon text-red-400"><Trash2 size={14} /></button>
              </div>
            )
          }}
        />
      </div>

      {/* Products */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Productos de Venta</h3>
          <button onClick={() => openPrd()} className="btn-primary flex items-center gap-2 text-xs px-3 py-1.5">
            <Plus size={14} /> Nuevo Producto
          </button>
        </div>
        <Table
          columns={prdColumns}
          data={products}
          actions={row => {
            const p = row as ProductCatalog
            return (
              <div className="flex gap-1">
                <button onClick={() => openPrd(p)} className="btn-icon"><Pencil size={14} /></button>
                <button onClick={() => deletePrd(p.id)} className="btn-icon text-red-400"><Trash2 size={14} /></button>
              </div>
            )
          }}
        />
      </div>

      {/* Service Modal */}
      <Modal open={showSvcModal} onClose={() => setShowSvcModal(false)} title={editingSvc ? 'Editar Servicio' : 'Nuevo Servicio'}>
        <div className="space-y-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Nombre *</label>
            <input className="input w-full" placeholder="Ej. Corte clásico" {...sf('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Categoría</label>
              <select className="input w-full" {...sf('category')}>
                {SERVICE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Precio *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                <input type="number" step="0.01" min="0" placeholder="0.00" className="input w-full pl-7" {...sf('price')} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowSvcModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSaveSvc} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Guardando...' : editingSvc ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Product Modal */}
      <Modal open={showPrdModal} onClose={() => setShowPrdModal(false)} title={editingPrd ? 'Editar Producto' : 'Nuevo Producto'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Nombre *</label>
              <input className="input w-full" placeholder="Ej. Cera para cabello" {...pf('name')} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Marca</label>
              <input className="input w-full" placeholder="Ej. Layrite" {...pf('brand')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Costo</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                <input type="number" step="0.01" min="0" placeholder="0.00" className="input w-full pl-7" {...pf('cost_price')} />
              </div>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>P. Venta *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                <input type="number" step="0.01" min="0" placeholder="0.00" className="input w-full pl-7" {...pf('sale_price')} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowPrdModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSavePrd} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Guardando...' : editingPrd ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ────────── Main ──────────
export default function Admin() {
  const [tab, setTab] = useState<Tab>('users')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'users', label: 'Usuarios' },
    { key: 'barbers', label: 'Barberos' },
    { key: 'catalog', label: 'Catálogo' },
  ]

  return (
    <div>
      <h1 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Administración</h1>

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? 'btn-primary text-xs px-4 py-2' : 'btn-secondary text-xs px-4 py-2'}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'barbers' && <BarbersTab />}
      {tab === 'catalog' && <CatalogTab />}
    </div>
  )
}
