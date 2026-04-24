import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { catalogApi } from '../services/api'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import { fmt } from '../utils/format'
import type { Service, Product } from '../types'
import toast from 'react-hot-toast'

type Tab = 'services' | 'products'

const emptyForm = { name: '', price: '', commission: '', description: '' }

export default function Catalog() {
  const [tab, setTab] = useState<Tab>('services')
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)

  const fetchAll = () => {
    catalogApi.services().then(r => setServices(r.data))
    catalogApi.products().then(r => setProducts(r.data))
  }
  useEffect(() => { fetchAll() }, [])

  const openNew = () => {
    setEditingService(null); setEditingProduct(null)
    setForm(emptyForm); setShowModal(true)
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

  const actionCols = (onEdit: () => void, onDel: () => void) => (
    <div className="flex gap-1.5">
      <button onClick={onEdit} className="btn-icon w-7 h-7"><Pencil size={12} /></button>
      <button onClick={onDel}  className="btn-icon w-7 h-7" style={{ color: '#f87171' } as React.CSSProperties}><Trash2 size={12} /></button>
    </div>
  )

  const serviceCols = [
    { key: 'name',       header: 'Nombre' },
    { key: 'price',      header: 'Precio',   render: (r: Service) => <span style={{ color: 'var(--gold-400)' }}>{fmt.money(r.price)}</span> },
    { key: 'commission', header: 'Comisión', render: (r: Service) => fmt.money(r.commission) },
    { key: 'actions',    header: '',         render: (r: Service) => actionCols(() => openEditS(r), () => delService(r.id)) },
  ]

  const productCols = [
    { key: 'name',       header: 'Nombre' },
    { key: 'price',      header: 'Precio',   render: (r: Product) => <span style={{ color: 'var(--gold-400)' }}>{fmt.money(r.price)}</span> },
    { key: 'commission', header: 'Comisión', render: (r: Product) => fmt.money(r.commission) },
    { key: 'actions',    header: '',         render: (r: Product) => actionCols(() => openEditP(r), () => delProduct(r.id)) },
  ]

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0' }}>
        {(['services', 'products'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2.5 text-sm font-medium transition-all duration-200 relative"
            style={{
              color: tab === t ? 'var(--gold-400)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--gold-500)' : '2px solid transparent',
            }}
          >
            {t === 'services' ? 'Servicios' : 'Productos'}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button id="new-catalog-btn" onClick={openNew} className="btn-gold">
          <Plus size={15} /> {tab === 'services' ? 'Nuevo servicio' : 'Nuevo producto'}
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {tab === 'services'
          ? <Table columns={serviceCols} data={services} />
          : <Table columns={productCols} data={products} />
        }
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={`${editingService || editingProduct ? 'Editar' : 'Nuevo'} ${tab === 'services' ? 'servicio' : 'producto'}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            ['name', 'Nombre', 'text'],
            ['price', 'Precio', 'number'],
            ['commission', 'Comisión', 'number'],
            ['description', 'Descripción', 'text'],
          ].map(([k, label, type]) => (
            <div key={k}>
              <label className="label">{label}</label>
              <input
                type={type}
                step={type === 'number' ? '0.01' : undefined}
                value={form[k as keyof typeof form]}
                onChange={e => set(k, e.target.value)}
                required={k === 'name'}
                className="input-dark"
              />
            </div>
          ))}
          <div className="flex gap-3 justify-end pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-gold">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
