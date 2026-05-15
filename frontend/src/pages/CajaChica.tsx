import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Wallet, Scissors, ShoppingBag, Receipt, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { cashRegisterApi } from '../services/api'
import { fmt } from '../utils/format'
import type { CashSummary, CashRegisterClosing } from '../types'

function DiscrepancyBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
        <CheckCircle2 size={15} />
        Cuadrado
      </div>
    )
  }
  const positive = value > 0
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold"
      style={{ background: positive ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)', color: positive ? '#fbbf24' : '#f87171' }}
    >
      {positive ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      {positive ? '+' : ''}{fmt.money(value)}
    </div>
  )
}

function ConfirmModal({
  discrepancy,
  actualCash,
  notes,
  onNotes,
  onConfirm,
  onCancel,
  loading,
}: {
  discrepancy: number
  actualCash: number
  notes: string
  onNotes: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const isBalanced = discrepancy === 0
  const isSurplus = discrepancy > 0
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Lock body scroll + Escape key
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onCancel() }
    document.addEventListener('keydown', handler)
    confirmRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handler)
    }
  }, [loading, onCancel])

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onCancel}
    >
      <div
        className="modal-panel max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(200,134,14,0.15)', border: '1px solid rgba(200,134,14,0.2)' }}
            >
              <Wallet size={20} style={{ color: 'var(--gold-400)' }} />
            </div>
            <div>
              <h2 id="modal-title" className="font-semibold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>
                Confirmar Cierre de Caja
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Efectivo contado: <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{fmt.money(actualCash)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            aria-label="Cerrar"
            className="btn-icon ml-2 flex-shrink-0 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Status banner */}
        {isBalanced ? (
          <div
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm font-medium"
            style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.18)' }}
          >
            <CheckCircle2 size={16} className="flex-shrink-0" />
            El efectivo cuadra perfectamente.
          </div>
        ) : (
          <div
            className="px-4 py-3 rounded-xl mb-5 text-sm"
            style={{
              background: isSurplus ? 'rgba(251,191,36,0.07)' : 'rgba(248,113,113,0.07)',
              border: `1px solid ${isSurplus ? 'rgba(251,191,36,0.18)' : 'rgba(248,113,113,0.18)'}`,
            }}
          >
            <div className="flex items-center gap-2 font-semibold mb-1" style={{ color: isSurplus ? '#fbbf24' : '#f87171' }}>
              <AlertCircle size={15} className="flex-shrink-0" />
              Descuadre de {isSurplus ? '+' : ''}{fmt.money(discrepancy)}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Se registrará como <span className="font-medium" style={{ color: isSurplus ? '#fbbf24' : '#f87171' }}>
                {isSurplus ? 'ingreso adicional (sobrante)' : 'egreso (faltante)'}
              </span> en el historial de cierres.
            </p>
          </div>
        )}

        {/* Notes */}
        <div className="mb-5">
          <label className="label mb-1.5 block">Notas (opcional)</label>
          <textarea
            className="input w-full resize-none text-sm"
            rows={2}
            placeholder="Observaciones del cierre..."
            value={notes}
            onChange={e => onNotes(e.target.value)}
          />
        </div>

        {/* Divider */}
        <div className="border-t mb-4" style={{ borderColor: 'var(--surface-border)' }} />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            className="btn-secondary flex-1 cursor-pointer"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            ref={confirmRef}
            className="btn-gold flex-1 cursor-pointer"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="inline-block w-3.5 h-3.5 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: 'currentColor', borderRightColor: 'rgba(255,255,255,0.3)' }}
                />
                Cerrando...
              </span>
            ) : 'Confirmar Cierre'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function CajaChica() {
  const [summary, setSummary] = useState<CashSummary | null>(null)
  const [closings, setClosings] = useState<CashRegisterClosing[]>([])
  const [actualCash, setActualCash] = useState('')
  const [notes, setNotes] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingClosings, setLoadingClosings] = useState(true)
  const [loadingClose, setLoadingClose] = useState(false)

  const fetchSummary = () => {
    setLoadingSummary(true)
    cashRegisterApi.summary()
      .then(r => setSummary(r.data))
      .catch(() => toast.error('Error cargando resumen de caja'))
      .finally(() => setLoadingSummary(false))
  }

  const fetchClosings = () => {
    setLoadingClosings(true)
    cashRegisterApi.closings()
      .then(r => setClosings(r.data))
      .catch(() => toast.error('Error cargando historial'))
      .finally(() => setLoadingClosings(false))
  }

  useEffect(() => {
    fetchSummary()
    fetchClosings()
  }, [])

  const parsedActual = parseFloat(actualCash) || 0
  const discrepancy = summary ? parsedActual - Number(summary.expected_cash) : 0
  const hasActual = actualCash !== '' && !isNaN(parseFloat(actualCash))

  const handleClose = async () => {
    setLoadingClose(true)
    try {
      await cashRegisterApi.close({ actual_cash: parsedActual, notes: notes || undefined })
      toast.success('Caja cerrada correctamente')
      setShowModal(false)
      setActualCash('')
      setNotes('')
      fetchSummary()
      fetchClosings()
    } catch {
      toast.error('Error al cerrar caja')
    } finally {
      setLoadingClose(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,134,14,0.15)' }}>
            <Wallet size={18} style={{ color: 'var(--gold-400)' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Caja Chica</h1>
            {summary && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Desde {fmt.datetime(summary.period_from)} · {fmt.datetime(summary.period_to)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Scissors size={14} style={{ color: 'var(--gold-400)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Cortes en efectivo</span>
          </div>
          {loadingSummary ? (
            <div className="skeleton h-7 w-24 rounded" />
          ) : (
            <p className="text-2xl font-bold" style={{ color: 'var(--gold-400)' }}>
              {fmt.money(Number(summary?.sales_cash ?? 0))}
            </p>
          )}
        </div>

        <div className="card space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={14} style={{ color: '#60a5fa' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Productos en efectivo</span>
          </div>
          {loadingSummary ? (
            <div className="skeleton h-7 w-24 rounded" />
          ) : (
            <p className="text-2xl font-bold" style={{ color: '#60a5fa' }}>
              {fmt.money(Number(summary?.product_sales_cash ?? 0))}
            </p>
          )}
        </div>

        <div className="card space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Receipt size={14} style={{ color: '#f87171' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Gastos en efectivo</span>
          </div>
          {loadingSummary ? (
            <div className="skeleton h-7 w-24 rounded" />
          ) : (
            <p className="text-2xl font-bold" style={{ color: '#f87171' }}>
              -{fmt.money(Number(summary?.expenses_cash ?? 0))}
            </p>
          )}
        </div>
      </div>

      {/* Main panel: expected + actual + discrepancy */}
      <div className="card space-y-5">
        {/* Expected total */}
        <div className="flex items-center justify-between px-4 py-4 rounded-xl" style={{ background: 'rgba(200,134,14,0.08)', border: '1px solid rgba(200,134,14,0.2)' }}>
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Efectivo esperado en caja</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cortes + Productos − Gastos</p>
          </div>
          {loadingSummary ? (
            <div className="skeleton h-8 w-28 rounded" />
          ) : (
            <span className="text-2xl font-bold" style={{ color: 'var(--gold-400)' }}>
              {fmt.money(Number(summary?.expected_cash ?? 0))}
            </span>
          )}
        </div>

        {/* Actual cash input */}
        <div>
          <label className="label mb-2 block">Efectivo contado en caja</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={actualCash}
              onChange={e => setActualCash(e.target.value)}
              className="input w-full pl-7 text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Discrepancy display */}
        {hasActual && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Descuadre</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {discrepancy > 0 ? 'Sobrante — ingreso inesperado' : discrepancy < 0 ? 'Faltante — pérdida en caja' : 'Sin descuadre'}
              </p>
            </div>
            <DiscrepancyBadge value={discrepancy} />
          </div>
        )}

        {/* Action button */}
        <button
          className="btn-gold w-full py-3 text-sm font-semibold"
          onClick={() => setShowModal(true)}
          disabled={!hasActual || loadingSummary}
        >
          Cuadrar Caja
        </button>
      </div>

      {/* Closings history */}
      <div className="card">
        <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
          Historial de Cierres
        </h3>

        {loadingClosings ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
          </div>
        ) : closings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Clock size={28} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin cierres registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark w-full text-sm">
              <thead>
                <tr>
                  <th>Fecha cierre</th>
                  <th>Período</th>
                  <th className="text-right">Esperado</th>
                  <th className="text-right">Real</th>
                  <th className="text-right">Descuadre</th>
                </tr>
              </thead>
              <tbody>
                {closings.map(c => {
                  const disc = Number(c.discrepancy)
                  const discColor = disc === 0 ? '#4ade80' : disc > 0 ? '#fbbf24' : '#f87171'
                  return (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>{fmt.datetime(c.closed_at)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        {fmt.datetime(c.period_from).slice(0, 16)} → {fmt.datetime(c.period_to).slice(0, 16)}
                      </td>
                      <td className="text-right font-medium" style={{ color: 'var(--gold-400)' }}>
                        {fmt.money(Number(c.expected_cash))}
                      </td>
                      <td className="text-right font-medium" style={{ color: 'var(--text-primary)' }}>
                        {fmt.money(Number(c.actual_cash))}
                      </td>
                      <td className="text-right font-semibold" style={{ color: discColor }}>
                        {disc > 0 ? '+' : ''}{fmt.money(disc)}
                        {c.notes && (
                          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }} title={c.notes}>📝</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ConfirmModal
          discrepancy={discrepancy}
          actualCash={parsedActual}
          notes={notes}
          onNotes={setNotes}
          onConfirm={handleClose}
          onCancel={() => setShowModal(false)}
          loading={loadingClose}
        />
      )}
    </div>
  )
}
