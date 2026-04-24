import { useState, useEffect } from 'react'
import { Plus, Trash2, Shield } from 'lucide-react'
import { usersApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import type { User } from '../types'
import toast from 'react-hot-toast'

const emptyForm = { username: '', full_name: '', email: '', role: 'barber', password: '' }

const ROLE_BADGE: Record<string, string> = {
  admin:   'badge-gold',
  manager: 'badge-success',
  barber:  'badge-danger',
}

export default function Admin() {
  const [users, setUsers] = useState<User[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const fetchUsers = () => usersApi.list().then(r => setUsers(r.data))
  useEffect(() => { fetchUsers() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await usersApi.create(form)
    toast.success('Usuario creado')
    setShowModal(false)
    fetchUsers()
  }

  const delUser = async (id: number) => {
    if (!confirm('¿Eliminar usuario?')) return
    await usersApi.delete(id)
    toast.success('Eliminado')
    fetchUsers()
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    { key: 'username',  header: 'Usuario' },
    { key: 'full_name', header: 'Nombre completo' },
    {
      key: 'role', header: 'Rol',
      render: (r: User) => (
        <span className={ROLE_BADGE[r.role] || 'badge-gold'}>
          <Shield size={10} />
          {r.role}
        </span>
      )
    },
    {
      key: 'is_active', header: 'Estado',
      render: (r: User) => (
        <span className={r.is_active ? 'badge-success' : 'badge-danger'}>
          {r.is_active ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    {
      key: 'actions', header: '',
      render: (r: User) => (
        <button onClick={() => delUser(r.id)} className="btn-icon w-7 h-7" style={{ color: '#f87171' } as React.CSSProperties}>
          <Trash2 size={12} />
        </button>
      )
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          id="new-user-btn"
          onClick={() => { setForm(emptyForm); setShowModal(true) }}
          className="btn-gold"
        >
          <Plus size={15} /> Nuevo usuario
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <Table columns={columns} data={users} />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo usuario" size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            ['username',  'Usuario'],
            ['full_name', 'Nombre completo'],
            ['email',     'Email'],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="label">{label}</label>
              <input
                value={form[k as keyof typeof form]}
                onChange={e => set(k, e.target.value)}
                required={k === 'username'}
                className="input-dark"
              />
            </div>
          ))}
          <div>
            <label className="label">Rol</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} className="input-dark">
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="barber">Barbero</option>
            </select>
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              required
              className="input-dark"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-gold">Crear</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
