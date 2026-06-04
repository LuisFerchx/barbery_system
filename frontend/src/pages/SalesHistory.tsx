import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Eye, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { salesApi, barbersApi, inventoryApi } from '../services/api'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import { fmt, localDayStr } from '../utils/format'
import type { Sale, Barber, SaleListOut, InventoryItem } from '../types'
import toast from 'react-hot-toast'

/**
 * Get the current date as an ISO date string (YYYY-MM-DD).
 *
 * @returns The current date formatted as `YYYY-MM-DD`.
 */
function todayStr() {
  return localDayStr()
}

/**
 * Produce a UTC date string that is the given number of days away from a base date.
 *
 * @param base - Base date in `YYYY-MM-DD` format
 * @param days - Number of days to add to `base` (use a negative value to subtract days)
 * @returns The resulting date in `YYYY-MM-DD` format (UTC)
 */
function offsetDate(base: string, days: number) {
  const d = new Date(base + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card_debit: 'Débito',
  card_credit: 'Crédito',
  transfer: 'Transferencia',
}

/**
 * Sales History page with a day picker, barber filter, paginated sales table, and row actions to view, edit, or delete sales; includes detail and edit modals.
 *
 * @returns The rendered Sales History page element.
 */
export default function SalesHistory() {
  const navigate = useNavigate()
  const [data, setData] = useState<SaleListOut>({ items: [], total: 0, page: 1, page_size: 20, pages: 1 })
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [page, setPage] = useState(1)
  const [barberId, setBarberId] = useState<string>('')
  const [date, setDate] = useState(todayStr)
  const [detail, setDetail] = useState<Sale | null>(null)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    barbersApi.list().then(r => setBarbers(r.data))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const offsetMin = -new Date().getTimezoneOffset()
    const sign = offsetMin >= 0 ? '+' : '-'
    const offH = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0')
    const offM = String(Math.abs(offsetMin) % 60).padStart(2, '0')
    const tz = `${sign}${offH}:${offM}`
    const date_from = `${date}T00:00:00${tz}`
    const date_to = `${date}T23:59:59${tz}`
    const params: Record<string, unknown> = { page, page_size: 20, date_from, date_to }
    if (barberId) params.barber_id = parseInt(barberId)
    salesApi.list(params)
      .then(r => setData(r.data))
      .catch(() => toast.error('Error al cargar ventas'))
      .finally(() => setLoading(false))
  }, [page, date, barberId])

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
      key: 'number', label: 'N°', render: (v: string, row: Sale) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--gold-400)' }}>{v}</span>
          {row.appointment_id && (
            <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
              Cita
            </span>
          )}
        </div>
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
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Día</label>
          <div className="flex items-center gap-1">
            <button className="btn-icon" onClick={() => { setDate(d => offsetDate(d, -1)); setPage(1) }}>
              <ChevronLeft size={14} />
            </button>
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setPage(1) }}
              className="input py-1.5 px-2 text-sm"
            />
            <button className="btn-icon" onClick={() => { setDate(d => offsetDate(d, 1)); setPage(1) }}>
              <ChevronRight size={14} />
            </button>
            <button className="btn-secondary text-xs py-1.5 px-3" onClick={() => { setDate(todayStr()); setPage(1) }}>
              Hoy
            </button>
          </div>
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
            <button onClick={e => { e.stopPropagation(); setEditingSale(row as Sale) }} className="btn-icon text-blue-400" title="Editar">
              <Pencil size={14} />
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
              {detail.appointment_id && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Origen</p>
                  <p style={{ color: '#60a5fa' }}>Cita agendada #{detail.appointment_id}</p>
                </div>
              )}
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

      {/* Edit Sale Modal */}
      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          open={!!editingSale}
          onClose={() => setEditingSale(null)}
          onSaved={() => {
            setEditingSale(null)
            load()
          }}
        />
      )}
    </div>
  )
}

/**
 * Modal form for editing an existing sale.
 *
 * Renders a modal that lets the user change payment method, mark the client as returning,
 * toggle and select a courtesy drink, edit notes, and submit updates to the sale.
 *
 * @param sale - The sale to edit; fields from this object initialize the form.
 * @param open - Whether the modal is currently open.
 * @param onClose - Callback invoked to close the modal without saving.
 * @param onSaved - Callback invoked after a successful save to allow the parent to refresh state.
 * @returns The modal element containing the edit form for the provided sale.
 */
function EditSaleModal({ sale, open, onClose, onSaved }: {
  sale: Sale
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [paymentMethod, setPaymentMethod] = useState(sale.payment_method)
  const [isReturning, setIsReturning] = useState(sale.is_returning_client)
  const [courtesyGiven, setCourtesyGiven] = useState(sale.courtesy_drink_given)
  const [courtesyItemId, setCourtesyItemId] = useState(String(sale.courtesy_drink_item_id || ''))
  const [notes, setNotes] = useState(sale.notes || '')
  const [drinks, setDrinks] = useState<InventoryItem[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    inventoryApi.list('courtesy').then(r => {
      setDrinks(r.data.filter((d: InventoryItem) => d.is_active))
    }).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (courtesyGiven && !courtesyItemId) {
      toast.error('Selecciona la bebida de cortesía')
      return
    }

    setSaving(true)
    try {
      await salesApi.update(sale.id, {
        payment_method: paymentMethod,
        is_returning_client: isReturning,
        courtesy_drink_given: courtesyGiven,
        courtesy_drink_item_id: courtesyGiven ? parseInt(courtesyItemId) : null,
        notes: notes || null,
      })
      toast.success('Venta actualizada')
      onSaved()
    } catch {
      toast.error('Error al actualizar la venta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Editar Venta ${sale.number}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Método de pago
          </label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value as 'cash' | 'card_debit' | 'card_credit' | 'transfer')}
            className="input w-full"
          >
            <option value="cash">Efectivo</option>
            <option value="card_debit">Tarjeta Débito</option>
            <option value="card_credit">Tarjeta Crédito</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isReturning}
            onChange={e => setIsReturning(e.target.checked)}
            className="rounded"
          />
          <span style={{ color: 'var(--text-primary)' }}>Cliente recurrente</span>
        </label>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={courtesyGiven}
              onChange={e => {
                setCourtesyGiven(e.target.checked)
                if (!e.target.checked) setCourtesyItemId('')
              }}
              className="rounded"
            />
            <span style={{ color: 'var(--text-primary)' }}>Se ofreció bebida de cortesía</span>
          </label>

          {courtesyGiven && (
            <div className="ml-6">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                Bebida seleccionada *
              </label>
              <select
                value={courtesyItemId}
                onChange={e => setCourtesyItemId(e.target.value)}
                className="input w-full"
              >
                <option value="">Seleccionar bebida...</option>
                {drinks.map(d => (
                  <option key={d.id} value={d.id} disabled={d.stock_current <= 0 && d.id !== sale.courtesy_drink_item_id}>
                    {d.name} — stock: {d.stock_current} {d.unit}
                    {d.stock_current <= 0 && d.id !== sale.courtesy_drink_item_id ? ' (sin stock)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Notas
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Observaciones..."
            className="input w-full resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
