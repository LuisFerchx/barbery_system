import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { catalogApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import { fmt } from '../utils/format'
import type { Service, Product } from '../types'
import toast from 'react-hot-toast'

type Tab = 'services' | 'products'

const emptyService = { name: '', price: '', commission: '', description: '' }
const emptyProduct = { name: '', price: '', commission: '', description: '' }

export default function Catalog() {
  const [tab, setTab] = useState<Tab>('services')
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyService)

  const fetchAll = () => {
    catalogApi.services().then(r => setServices(r.data))
    catalogApi.products().then(r => setProducts(r.data))
  }
  useEffect(() => { fetchAll() }, [])

  const openNew = () => {
    setEditingService(null); setEditingProduct(null)
    setForm(emptyService); setShowModal(true)
  }
  const openEditS = (s: Service) => { setEditingService(s); setEditingProduct(null); setForm({ name: s.name, price: String(s.price), commission: String(s.commission), description: s.description || '' }); setShowModal(true) }
  const openEditP = (p: Product) => { setEditingProduct(p); setEditingService(null); setForm({ name: p.name, price: String(p.price), commission: String(p.commission), description: p.description || '' }); setShowModal(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, price: Number(form.price), commission: Number(form.commission) }
    try {
      if (tab === 'services') {
        if (editingService) await catalogApi.updateService(editingService.id, payload)
        else await catalogApi.createService(payload)
      } else {
        if (editingProduct) await catalogApi.updateProduct(editingProduct.id, payload)
        else await catalogApi.createProduct(payload)
      }
      toast.success('Guardado')
      setShowModal(false)
      fetchAll()
    } catch { toast.error('Error al guardar') }
  }

  const delService = async (id: number) => { if (!confirm('¿Eliminar?')) return; await catalogApi.deleteService(id); toast.success('Eliminado'); fetchAll() }
  const delProduct = async (id: number) => { if (!confirm('¿Eliminar?')) return; await catalogApi.deleteProduct(id); toast.success('Eliminado'); fetchAll() }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const serviceCols = [
    { key: 'name', header: 'Nombre' },
    { key: 'price', header: 'Precio', render: (r: Service) => fmt.money(r.price) },
    { key: 'commission', header: 'Comisión', render: (r: Service) => fmt.money(r.commission) },
    { key: 'actions', header: '', render: (r: Service) => (
      <div className="flex gap-2">
        <button onClick={() => openEditS(r)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
        <button onClick={() => delService(r.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
      </div>
    )},
  ]

  const productCols = [
    { key: 'name', header: 'Nombre' },
    { key: 'price', header: 'Precio', render: (r: Product) => fmt.money(r.price) },
    { key: 'commission', header: 'Comisión', render: (r: Product) => fmt.money(r.commission) },
    { key: 'actions', header: '', render: (r: Product) => (
      <div className="flex gap-2">
        <button onClick={() => openEditP(r)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
        <button onClick={() => delProduct(r.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200">
        {(['services', 'products'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'services' ? 'Servicios' : 'Productos'}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={openNew} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
          <Plus size={16} /> {tab === 'services' ? 'Nuevo servicio' : 'Nuevo producto'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {tab === 'services'
          ? <Table columns={serviceCols} data={services} />
          : <Table columns={productCols} data={products} />
        }
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={`${editingService || editingProduct ? 'Editar' : 'Nuevo'} ${tab === 'services' ? 'servicio' : 'producto'}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[['name', 'Nombre', 'text'], ['price', 'Precio', 'number'], ['commission', 'Comisión', 'number'], ['description', 'Descripción', 'text']].map(([k, label, type]) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input type={type} step={type === 'number' ? '0.01' : undefined} value={form[k as keyof typeof form]} onChange={e => set(k, e.target.value)} required={k === 'name'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          ))}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
