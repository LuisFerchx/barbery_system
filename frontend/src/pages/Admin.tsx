import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { usersApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import type { User } from '../types'
import toast from 'react-hot-toast'

const emptyForm = { username: '', full_name: '', email: '', role: 'barber', password: '' }

export default function Admin() {
  const [users, setUsers] = useState<User[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const fetch = () => usersApi.list().then(r => setUsers(r.data))
  useEffect(() => { fetch() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await usersApi.create(form)
    toast.success('Usuario creado')
    setShowModal(false)
    fetch()
  }

  const delUser = async (id: number) => {
    if (!confirm('¿Eliminar usuario?')) return
    await usersApi.delete(id)
    toast.success('Eliminado')
    fetch()
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    { key: 'username', header: 'Usuario' },
    { key: 'full_name', header: 'Nombre completo' },
    { key: 'role', header: 'Rol', render: (r: User) => <span className="capitalize">{r.role}</span> },
    { key: 'is_active', header: 'Estado', render: (r: User) => <span className={r.is_active ? 'text-green-600' : 'text-gray-400'}>{r.is_active ? 'Activo' : 'Inactivo'}</span> },
    { key: 'actions', header: '', render: (r: User) => (
      <button onClick={() => delUser(r.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setForm(emptyForm); setShowModal(true) }} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <Table columns={columns} data={users} />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo usuario" size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {[['username', 'Usuario'], ['full_name', 'Nombre completo'], ['email', 'Email']].map(([k, label]) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input value={form[k as keyof typeof form]} onChange={e => set(k, e.target.value)} required={k === 'username'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="barber">Barbero</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600">Crear</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
