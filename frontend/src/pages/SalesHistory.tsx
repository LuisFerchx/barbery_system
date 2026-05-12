import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { salesApi, barbersApi } from '../services/api'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import { fmt } from '../utils/format'
import type { Sale, Barber, SaleListOut } from '../types'
import toast from 'react-hot-toast'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card_debit: 'Débito',
  card_credit: 'Crédito',
  transfer: 'Transferencia',
}

export default function SalesHistory() {
  const navigate = useNavigate()
  const [data, setData] = useState<SaleListOut>({ items: [], total: 0, page: 1, page_size: 20, pages: 1 })
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [page, setPage] = useState(1)
  const [barberId, setBarberId] = useState<string>('')
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [detail, setDetail] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    barbersApi.list().then(r => setBarbers(r.data))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const [year, mon] = month.split('-')
    const date_from = `${year}-${mon}-01T00:00:00`
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate()
    const date_to = `${year}-${mon}-${lastDay}T23:59:59`
    const params: Record<string, unknown> = { page, page_size: 20, date_from, date_to }
    if (barberId) params.barber_id = parseInt(barberId)
    salesApi.list(params)
      .then(r => setData(r.data))
      .catch(() => toast.error('Error al cargar ventas'))
      .finally(() => setLoading(false))
  }, [page, month, barberId])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta venta?')) return
    try {
      await salesApi.delete(id)
      toast.success('Venta eliminada')
      load()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const columns = [
    {
      key: 'number', label: 'N°', render: (v: string) => (
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--gold-400)' }}>{v}</span>
      )
    },
    { key: 'date', label: 'Fecha', render: (v: string) => fmt.datetime(v) },
    { key: 'client_name', label: 'Cliente', render: (v: string | null) => v || <span style={{ color: 'var(--text-muted)' }}>—</span> },
    { key: 'barber_name', label: 'Barbero' },
    { key: 'service_name', label: 'Servicio' },
    { key: 'gross_total', label: 'Total', render: (v: number) => fmt.money(Number(v)) },
    {
      key: 'real_income', label: 'Ingreso Real', render: (v: number) => (
        <span style={{ color: '#4ade80' }}>{fmt.money(Number(v))}</span>
      )
    },
    { key: 'payment_method', label: 'Pago', render: (v: string) => PAYMENT_LABELS[v] || v },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Historial de Ventas</h1>
        <button onClick={() => navigate('/sales/new')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Corte
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex gap-3 flex-wrap">
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Mes</label>
          <input
            type="month"
            value={month}
            onChange={e => { setMonth(e.target.value); setPage(1) }}
            className="input"
          />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Barbero</label>
          <select value={barberId} onChange={e => { setBarberId(e.target.value); setPage(1) }} className="input">
            <option value="">Todos</option>
            {barbers.map(b => <option key={b.id} value={b.id}>{b.name} {b.lastname}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {data.total} ventas encontradas
          </span>
        </div>
      </div>

      <Table
        columns={columns}
        data={data.items}
        loading={loading}
        onRowClick={row => setDetail(row as Sale)}
        actions={row => (
          <div className="flex gap-1">
            <button onClick={e => { e.stopPropagation(); setDetail(row as Sale) }} className="btn-icon" title="Ver detalle">
              <Eye size={14} />
            </button>
            <button onClick={e => { e.stopPropagation(); handleDelete((row as Sale).id) }} className="btn-icon text-red-400" title="Eliminar">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      />

      {/* Pagination */}
      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-icon">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {page} / {data.pages}
          </span>
          <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="btn-icon">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Sale Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Venta ${detail?.number}`} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Fecha</p>
                <p style={{ color: 'var(--text-primary)' }}>{fmt.datetime(detail.date)}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Método de pago</p>
                <p style={{ color: 'var(--text-primary)' }}>{PAYMENT_LABELS[detail.payment_method] || detail.payment_method}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Barbero</p>
                <p style={{ color: 'var(--text-primary)' }}>{detail.barber_name}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Cliente</p>
                <p style={{ color: 'var(--text-primary)' }}>{detail.client_name || 'Sin registrar'}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Servicio</p>
                <p style={{ color: 'var(--text-primary)' }}>{detail.service_name}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Tipo de cliente</p>
                <p style={{ color: 'var(--text-primary)' }}>{detail.is_returning_client ? 'Recurrente' : 'Nuevo'}</p>
              </div>
            </div>

            <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Total bruto</span>
                <span style={{ color: 'var(--text-primary)' }}>{fmt.money(Number(detail.gross_total))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Comisión barbero</span>
                <span style={{ color: '#f87171' }}>-{fmt.money(Number(detail.barber_commission_amount))}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: 'var(--gold-400)' }}>Ingreso Real</span>
                <span style={{ color: 'var(--gold-400)' }}>{fmt.money(Number(detail.real_income))}</span>
              </div>
              <div className="pt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Ganancia</span>
                  <span style={{ color: '#4ade80' }}>{fmt.money(Number(detail.split_profit))}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Sueldo socios</span>
                  <span style={{ color: '#60a5fa' }}>{fmt.money(Number(detail.split_owner_salary))}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Impuestos</span>
                  <span style={{ color: '#f87171' }}>{fmt.money(Number(detail.split_taxes))}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Gastos operación</span>
                  <span style={{ color: '#c084fc' }}>{fmt.money(Number(detail.split_operating))}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 text-sm">
              <span style={{ color: detail.courtesy_drink_given ? '#4ade80' : 'var(--text-muted)' }}>
                {detail.courtesy_drink_given ? '✓' : '✗'} Bebida cortesía
                {detail.courtesy_drink_given && detail.courtesy_drink_item_name && (
                  <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    ({detail.courtesy_drink_item_name})
                  </span>
                )}
              </span>
              <span style={{ color: detail.cross_sell ? '#4ade80' : 'var(--text-muted)' }}>
                {detail.cross_sell ? '✓' : '✗'} Venta cruzada
              </span>
            </div>

            {detail.notes && (
              <p className="text-sm p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                {detail.notes}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
