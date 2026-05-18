import { useState, useEffect, useCallback } from 'react'
import { Plus, Eye, RefreshCw, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Table from '../components/ui/Table'
import CitaModal from '../components/citas/CitaModal'
import { appointmentsApi, barbersApi } from '../services/api'
import type { Appointment, Barber } from '../types'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: 'rgba(200,134,14,0.12)',  color: 'var(--gold-400)' },
  confirmed: { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa' },
  completed: { bg: 'rgba(74,222,128,0.12)',  color: '#4ade80' },
  cancelled: { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
  no_show:   { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af' },
}

const STATUS_FILTERS = ['todos', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function offsetDate(base: string, days: number) {
  const d = new Date(base + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function CitasList() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)

  const [date, setDate] = useState(todayStr)
  const [barberId, setBarberId] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')

  const [modal, setModal] = useState<{
    open: boolean
    mode: 'create' | 'view' | 'reschedule'
    appointment: Appointment | null
  }>({ open: false, mode: 'create', appointment: null })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { date, page_size: 200 }
      if (barberId) params.barber_id = barberId
      if (statusFilter !== 'todos') params.status = statusFilter
      const res = await appointmentsApi.list(params)
      setAppointments(res.data.items ?? [])
    } catch {
      toast.error('Error al cargar citas')
    } finally {
      setLoading(false)
    }
  }, [date, barberId, statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    barbersApi.list({ active_only: true }).then(r => setBarbers(r.data as Barber[]))
  }, [])

  const openCreate = () => setModal({ open: true, mode: 'create', appointment: null })
  const openView = (a: Appointment) => setModal({ open: true, mode: 'view', appointment: a })
  const openReschedule = (a: Appointment) => setModal({ open: true, mode: 'reschedule', appointment: a })
  const closeModal = () => setModal(m => ({ ...m, open: false }))

  const handleCancel = async (a: Appointment) => {
    if (!confirm('¿Cancelar esta cita?')) return
    try {
      await appointmentsApi.delete(a.id)
      toast.success('Cita cancelada')
      load()
    } catch {
      toast.error('Error al cancelar')
    }
  }

  const columns = [
    {
      key: 'scheduled_at',
      label: 'Hora',
      render: (v: string, row: Appointment) => (
        <span className="font-mono text-sm" style={{ color: 'var(--gold-400)' }}>
          {fmtTime(v)} – {fmtTime(row.end_at)}
        </span>
      ),
    },
    {
      key: 'client_name',
      label: 'Cliente',
      render: (_: unknown, row: Appointment) => (
        <span style={{ color: 'var(--text-secondary)' }}>{row.client_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</span>
      ),
    },
    {
      key: 'barber_name',
      label: 'Barbero',
      render: (v: string) => <span style={{ color: 'var(--text-primary)' }}>{v}</span>,
    },
    {
      key: 'service_name',
      label: 'Servicio',
      render: (v: string, row: Appointment) => (
        <span style={{ color: 'var(--text-secondary)' }}>{v} <span style={{ color: 'var(--text-muted)' }}>({row.duration_minutes} min)</span></span>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (v: string) => {
        const c = STATUS_COLORS[v] || STATUS_COLORS.pending
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: c.bg, color: c.color }}>
            {STATUS_LABELS[v] || v}
          </span>
        )
      },
    },
  ]

  const dateLabel = (() => {
    const d = new Date(date + 'T00:00:00Z')
    return d.toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
  })()

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-lg capitalize" style={{ color: 'var(--text-primary)' }}>{dateLabel}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {appointments.length} cita{appointments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus size={14} /> Nueva Cita
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Date nav */}
        <div className="flex items-center gap-1">
          <button className="btn-icon" onClick={() => setDate(d => offsetDate(d, -1))}>
            <ChevronLeft size={14} />
          </button>
          <input
            type="date"
            className="input py-1.5 px-2 text-sm"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <button className="btn-icon" onClick={() => setDate(d => offsetDate(d, 1))}>
            <ChevronRight size={14} />
          </button>
          <button
            className="btn-secondary text-xs py-1.5 px-3"
            onClick={() => setDate(todayStr())}
          >
            Hoy
          </button>
        </div>

        {/* Barber filter */}
        <select
          className="input py-1.5 text-sm"
          style={{ minWidth: 160 }}
          value={barberId}
          onChange={e => setBarberId(e.target.value)}
        >
          <option value="">Todos los barberos</option>
          {barbers.map(b => (
            <option key={b.id} value={b.id}>{b.name} {b.lastname}</option>
          ))}
        </select>

        {/* Status chips */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: statusFilter === s
                  ? (s === 'todos' ? 'rgba(200,134,14,0.2)' : (STATUS_COLORS[s]?.bg || 'rgba(200,134,14,0.2)'))
                  : 'rgba(255,255,255,0.04)',
                color: statusFilter === s
                  ? (s === 'todos' ? 'var(--gold-400)' : (STATUS_COLORS[s]?.color || 'var(--gold-400)'))
                  : 'var(--text-muted)',
                border: '1px solid',
                borderColor: statusFilter === s
                  ? (s === 'todos' ? 'rgba(200,134,14,0.3)' : (STATUS_COLORS[s]?.color + '44' || 'rgba(200,134,14,0.3)'))
                  : 'rgba(255,255,255,0.06)',
              }}
            >
              {s === 'todos' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={appointments}
        loading={loading}
        emptyText="Sin citas para este día"
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button className="btn-icon" title="Ver detalle" onClick={() => openView(row)}>
              <Eye size={13} />
            </button>
            {row.status !== 'cancelled' && row.status !== 'completed' && row.status !== 'no_show' && (
              <>
                <button className="btn-icon" title="Reagendar" onClick={() => openReschedule(row)}>
                  <RefreshCw size={13} />
                </button>
                <button className="btn-icon" title="Cancelar" onClick={() => handleCancel(row)}
                  style={{ color: '#f87171' }}>
                  <XCircle size={13} />
                </button>
              </>
            )}
          </div>
        )}
      />

      <CitaModal
        open={modal.open}
        onClose={closeModal}
        mode={modal.mode}
        appointment={modal.appointment}
        defaultDate={date}
        onSaved={load}
        onReschedule={(a) => setModal({ open: true, mode: 'reschedule', appointment: a })}
      />
    </div>
  )
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

