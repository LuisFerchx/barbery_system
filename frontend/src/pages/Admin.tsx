import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, CalendarDays, Clock, RefreshCw } from 'lucide-react'
import { usersApi, barbersApi, catalogApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import PhoneInput, { splitPhone } from '../components/ui/PhoneInput'
import { fmt } from '../utils/format'
import type { User, Barber, BarberHours, ServiceCatalog, ProductCatalog } from '../types'
import toast from 'react-hot-toast'

type Tab = 'users' | 'barbers' | 'catalog'

const WEEKDAYS_SHORT = [
  { value: 0, label: 'L' },
  { value: 1, label: 'M' },
  { value: 2, label: 'M' },
  { value: 3, label: 'J' },
  { value: 4, label: 'V' },
  { value: 5, label: 'S' },
  { value: 6, label: 'D' },
]


// ────────── Users ──────────
const EMPTY_USER = { username: '', full_name: '', email: '', role: 'barber', password: '' }

/**
 * Renders the Users administration tab with a table of users, inline row actions, and a modal for creating users.
 *
 * @returns The Users administration UI containing a users table with toggle/delete actions and a "Nuevo Usuario" creation modal.
 */
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

interface BarberHoursModalProps {
  open: boolean
  onClose: () => void
  barber: Barber
}

/**
 * Modal for creating, editing and managing a barber's blocking schedule.
 *
 * Loads the barber's existing blocking rules when opened and allows creating or updating recurring blocks, deleting blocks, and creating date-specific exceptions.
 *
 * @param open - Whether the modal is visible
 * @param onClose - Callback invoked to close the modal
 * @param barber - Barber whose blocking schedule is being managed
 * @returns The modal dialog JSX for managing a barber's blocking hours
 */
function BarberHoursModal({ open, onClose, barber }: BarberHoursModalProps) {
  const [hoursList, setHoursList] = useState<BarberHours[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('Almuerzo')
  const [startTime, setStartTime] = useState('13:00')
  const [endTime, setEndTime] = useState('14:00')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [isRecurring, setIsRecurring] = useState(true)
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4])
  const [editingId, setEditingId] = useState<number | null>(null)

  const [showExceptionForm, setShowExceptionForm] = useState(false)
  const [exceptionDate, setExceptionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [exceptionStartTime, setExceptionStartTime] = useState('14:00')
  const [exceptionEndTime, setExceptionEndTime] = useState('15:00')
  const [selectedParentBlock, setSelectedParentBlock] = useState<BarberHours | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    barbersApi.getHours(barber.id)
      .then(r => setHoursList(r.data))
      .catch(() => toast.error('Error al cargar bloqueos'))
      .finally(() => setLoading(false))
  }, [barber.id])

  useEffect(() => {
    if (open) {
      load()
      resetForm()
    }
  }, [open, load])

  const resetForm = () => {
    setName('Almuerzo')
    setStartTime('13:00')
    setEndTime('14:00')
    setStartDate(new Date().toISOString().slice(0, 10))
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    setEndDate(d.toISOString().slice(0, 10))
    setIsRecurring(true)
    setSelectedDays([0, 1, 2, 3, 4])
    setEditingId(null)
    setShowExceptionForm(false)
    setSelectedParentBlock(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !startTime || !endTime || !startDate || !endDate) {
      toast.error('Completa los campos requeridos')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        start_time: startTime,
        end_time: endTime,
        start_date: startDate,
        end_date: endDate,
        is_recurring: isRecurring,
        day_of_week: isRecurring ? selectedDays.sort((a,b)=>a-b).join(',') : null,
      }

      if (editingId) {
        await barbersApi.updateHours(editingId, payload)
        toast.success('Bloqueo actualizado')
      } else {
        await barbersApi.createHours(barber.id, payload)
        toast.success('Bloqueo creado')
      }
      resetForm()
      load()
    } catch {
      toast.error('Error al guardar bloqueo')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (bh: BarberHours) => {
    setEditingId(bh.id)
    setName(bh.name)
    setStartTime(bh.start_time)
    setEndTime(bh.end_time)
    setStartDate(bh.start_date)
    setEndDate(bh.end_date)
    setIsRecurring(bh.is_recurring)
    if (bh.day_of_week) {
      setSelectedDays(bh.day_of_week.split(',').map(Number))
    } else {
      setSelectedDays([])
    }
    setShowExceptionForm(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este bloqueo de horario?')) return
    try {
      await barbersApi.deleteHours(id)
      toast.success('Bloqueo eliminado')
      if (editingId === id) resetForm()
      load()
    } catch {
      toast.error('Error al eliminar bloqueo')
    }
  }

  const handleOpenException = (bh: BarberHours) => {
    setSelectedParentBlock(bh)
    setExceptionDate(new Date().toISOString().slice(0, 10))
    setExceptionStartTime(bh.start_time)
    setExceptionEndTime(bh.end_time)
    setShowExceptionForm(true)
    setEditingId(null)
  }

  const handleSaveException = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedParentBlock) return

    setSaving(true)
    try {
      const currentExceptions = selectedParentBlock.exceptions
        ? selectedParentBlock.exceptions.split(',').map(s => s.trim())
        : []
      
      if (!currentExceptions.includes(exceptionDate)) {
        currentExceptions.push(exceptionDate)
      }

      await barbersApi.updateHours(selectedParentBlock.id, {
        exceptions: currentExceptions.join(',')
      })

      await barbersApi.createHours(barber.id, {
        name: `Excepción: ${selectedParentBlock.name}`,
        start_time: exceptionStartTime,
        end_time: exceptionEndTime,
        start_date: exceptionDate,
        end_date: exceptionDate,
        is_recurring: false,
      })

      toast.success('Modificado para el día específico')
      resetForm()
      load()
    } catch {
      toast.error('Error al guardar excepción')
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const getDayNames = (dayStr?: string | null) => {
    if (!dayStr) return 'Todos los días'
    const days = dayStr.split(',').map(Number)
    const names = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    return days.map(d => names[d]).join(', ')
  }

  return (
    <Modal open={open} onClose={onClose} title={`Bloqueos: ${barber.name} ${barber.lastname}`} size="lg">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4 lg:border-r lg:border-white/10 lg:pr-6">
          {!showExceptionForm ? (
            <form onSubmit={handleSave} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--gold-400)' }}>
                {editingId ? 'Editar Regla de Bloqueo' : 'Nuevo Bloqueo de Horas'}
              </h3>
              
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Motivo / Nombre *</label>
                <input
                  className="input w-full"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: Almuerzo, Reunión"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Hora Inicio *</label>
                  <input
                    type="time"
                    className="input w-full"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Hora Fin *</label>
                  <input
                    type="time"
                    className="input w-full"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Fecha Inicio *</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Fecha Fin *</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={isRecurring}
                  onChange={e => setIsRecurring(e.target.checked)}
                  className="rounded border-white/10 text-amber-500 focus:ring-amber-500 bg-black/40"
                />
                <label htmlFor="is_recurring" className="text-xs select-none" style={{ color: 'var(--text-secondary)' }}>
                  ¿Es un horario recurrente?
                </label>
              </div>

              {isRecurring && (
                <div>
                  <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Días de Recurrencia</label>
                  <div className="flex gap-1.5 justify-between py-1">
                    {WEEKDAYS_SHORT.map(day => {
                      const isSelected = selectedDays.includes(day.value)
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className="w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all duration-150"
                          style={{
                            background: isSelected ? 'rgba(200, 134, 14, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            color: isSelected ? 'var(--gold-400)' : 'var(--text-muted)',
                            border: isSelected ? '1px solid var(--gold-400)' : '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: isSelected ? '0 0 10px rgba(200, 134, 14, 0.2)' : 'none',
                          }}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {editingId && (
                  <button type="button" onClick={resetForm} className="btn-secondary flex-1 text-xs">
                    Cancelar
                  </button>
                )}
                <button type="submit" disabled={saving} className="btn-primary flex-1 text-xs">
                  {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSaveException} className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <button type="button" onClick={resetForm} className="text-xs text-amber-400 hover:underline">
                  &larr; Volver al formulario regular
                </button>
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Modificar Día Específico
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Modifica el horario de <strong>{selectedParentBlock?.name}</strong> solo para un día específico sin romper su configuración recurrente de los demás días.
              </p>

              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Fecha Específica *</label>
                <input
                  type="date"
                  className="input w-full"
                  value={exceptionDate}
                  min={selectedParentBlock?.start_date}
                  max={selectedParentBlock?.end_date}
                  onChange={e => setExceptionDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Nueva Hora Inicio *</label>
                  <input
                    type="time"
                    className="input w-full"
                    value={exceptionStartTime}
                    onChange={e => setExceptionStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Nueva Hora Fin *</label>
                  <input
                    type="time"
                    className="input w-full"
                    value={exceptionEndTime}
                    onChange={e => setExceptionEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1 text-xs">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 text-xs">
                  {saving ? 'Guardando...' : 'Aplicar Cambio'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="lg:col-span-7 flex flex-col min-h-[300px]">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Configuración de Bloqueos Vigentes
          </h3>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>
              Cargando bloqueos...
            </div>
          ) : hoursList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
              <Clock className="opacity-20 mb-2" size={32} style={{ color: 'var(--gold-400)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>No hay bloqueos configurados</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Usa el panel de la izquierda para definir el horario de almuerzo u otros descansos.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {hoursList.map(bh => (
                <div
                  key={bh.id}
                  className="p-3 rounded-xl flex items-center justify-between transition-all duration-150"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: editingId === bh.id ? '1px solid var(--gold-400)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {bh.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium"
                        style={{
                          background: bh.is_recurring ? 'rgba(200,134,14,0.1)' : 'rgba(255,255,255,0.08)',
                          color: bh.is_recurring ? 'var(--gold-400)' : 'var(--text-muted)',
                        }}
                      >
                        {bh.is_recurring ? 'Recurrente' : 'Específico'}
                      </span>
                    </div>
                    
                    <p className="text-xs font-semibold text-amber-400">
                      {bh.start_time} &ndash; {bh.end_time}
                    </p>

                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Vigencia: {bh.start_date} al {bh.end_date}
                    </p>
                    
                    {bh.is_recurring && (
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Días: <span className="text-amber-500/80">{getDayNames(bh.day_of_week)}</span>
                      </p>
                    )}

                    {bh.exceptions && (
                      <p className="text-[10px] text-red-400">
                        Exclusiones: {bh.exceptions}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1.5 items-center">
                    {bh.is_recurring && (
                      <button
                        onClick={() => handleOpenException(bh)}
                        className="btn-icon text-xs text-amber-500 hover:text-amber-400"
                        title="Modificar un día específico"
                      >
                        <RefreshCw size={12} />
                      </button>
                    )}
                    <button onClick={() => handleEdit(bh)} className="btn-icon" title="Editar">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDelete(bh.id)} className="btn-icon text-red-400" title="Eliminar">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ────────── Barbers ──────────
const EMPTY_BARBER = { name: '', lastname: '', dialCode: '+57', phone: '', commission_rate: '40' }

/**
 * Renders the "Barbers" administration tab, including the barbers list, create/edit modal,
 * photo upload, active-state toggle, and access to the barber hours (blockings) modal.
 *
 * @returns The rendered Barbers tab element ready for inclusion in the Admin page.
 */
function BarbersTab() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Barber | null>(null)
  const [form, setForm] = useState(EMPTY_BARBER)
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showHoursModal, setShowHoursModal] = useState(false)
  const [selectedBarberForHours, setSelectedBarberForHours] = useState<Barber | null>(null)

  const openHours = (b: Barber) => {
    setSelectedBarberForHours(b)
    setShowHoursModal(true)
  }

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
              <button onClick={() => openHours(b)} className="btn-icon text-amber-400" title="Gestionar Bloqueos">
                <CalendarDays size={14} />
              </button>
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
      {selectedBarberForHours && (
        <BarberHoursModal
          open={showHoursModal}
          onClose={() => { setShowHoursModal(false); setSelectedBarberForHours(null) }}
          barber={selectedBarberForHours}
        />
      )}
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
