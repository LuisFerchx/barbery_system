import { useState, useEffect, useCallback } from 'react'
import { Clock, User, Scissors, Calendar, RefreshCw, XCircle, CheckCircle, AlertCircle, CalendarPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import { appointmentsApi, barbersApi, clientsApi, catalogApi } from '../../services/api'
import { fmt } from '../../utils/format'
import type { Appointment, Barber, Client, ServiceCatalog } from '../../types'

type Mode = 'create' | 'view' | 'reschedule'

interface Props {
  open: boolean
  onClose: () => void
  mode: Mode
  appointment?: Appointment | null
  defaultDate?: string
  defaultTime?: string
  onSaved: () => void
  onReschedule?: (appointment: Appointment) => void
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--gold-400)',
  confirmed: '#60a5fa',
  completed: '#4ade80',
  cancelled: '#f87171',
  no_show: '#9ca3af',
}

/**
 * Generate 15-minute time slots for a full day in `HH:MM` format.
 *
 * @returns An array of time strings from `00:00` to `23:45` at 15-minute intervals (e.g., `00:00`, `00:15`, …, `23:45`)
 */
function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

/**
 * Render a modal for creating, viewing, and rescheduling appointments.
 *
 * The component manages local state for selectable barbers, clients, and services,
 * provides form controls for creating or rescheduling an appointment, displays
 * appointment details in view mode, and performs create/reschedule/status/cancel
 * actions via the appointments API. It also exposes a Google Calendar link for a shown appointment.
 *
 * @param open - Whether the modal is visible
 * @param onClose - Callback to close the modal
 * @param mode - One of `'create' | 'view' | 'reschedule'` to select the modal behavior
 * @param appointment - Appointment to display or reschedule (required for `view` and `reschedule` modes)
 * @param defaultDate - Optional initial date for create/reschedule forms in `YYYY-MM-DD` format
 * @param defaultTime - Optional initial time for create/reschedule forms in `HH:MM` format
 * @param onSaved - Callback invoked after a successful create, reschedule, status change, or cancellation
 * @param onReschedule - Optional callback invoked when the user requests to reschedule from view mode
 * @returns The modal's JSX element rendering the appointment UI for the selected mode
 */
export default function CitaModal({ open, onClose, mode, appointment, defaultDate, defaultTime, onSaved, onReschedule }: Props) {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<ServiceCatalog[]>([])

  const [barberId, setBarberId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState(defaultTime || '09:00')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedService = services.find(s => String(s.id) === serviceId)
  const duration = selectedService?.duration ?? 30

  const computeEndTime = () => {
    if (!time) return ''
    const [h, m] = time.split(':').map(Number)
    const total = h * 60 + m + duration
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  const loadCatalog = useCallback(async () => {
    try {
      const [b, c, s] = await Promise.all([
        barbersApi.list({ active_only: true }),
        clientsApi.list({ active_only: true }),
        catalogApi.services({ active_only: true }),
      ])
      setBarbers(b.data as Barber[])
      setClients(c.data as Client[])
      setServices(s.data as ServiceCatalog[])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    if (open && (mode === 'create' || mode === 'reschedule')) loadCatalog()
  }, [open, mode, loadCatalog])

  useEffect(() => {
    if (open && mode === 'create') {
      setBarberId('')
      setServiceId('')
      setClientId('')
      setDate(defaultDate || new Date().toISOString().slice(0, 10))
      setTime(defaultTime || '09:00')
      setNotes('')
    }
    if (open && mode === 'reschedule' && appointment) {
      const dt = new Date(appointment.scheduled_at)
      setDate(dt.toISOString().slice(0, 10))
      setTime(`${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`)
    }
  }, [open, mode, appointment, defaultDate, defaultTime])

  const handleCreate = async () => {
    if (!barberId || !serviceId || !date || !time) {
      toast.error('Completa barbero, servicio, fecha y hora')
      return
    }
    setLoading(true)
    try {
      const scheduled_at = `${date}T${time}:00+00:00`
      await appointmentsApi.create({
        barber_id: Number(barberId),
        service_id: Number(serviceId),
        client_id: clientId ? Number(clientId) : null,
        scheduled_at,
        notes: notes || null,
      })
      toast.success('Cita creada')
      onSaved()
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg || 'Error al crear cita')
    } finally {
      setLoading(false)
    }
  }

  const handleReschedule = async () => {
    if (!appointment || !date || !time) return
    setLoading(true)
    try {
      const scheduled_at = `${date}T${time}:00+00:00`
      await appointmentsApi.reschedule(appointment.id, { scheduled_at })
      toast.success('Cita reagendada')
      onSaved()
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg || 'Error al reagendar')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!appointment) return
    setLoading(true)
    try {
      await appointmentsApi.update(appointment.id, { status })
      toast.success('Estado actualizado')
      onSaved()
      onClose()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!appointment) return
    if (!confirm('¿Cancelar esta cita?')) return
    setLoading(true)
    try {
      await appointmentsApi.delete(appointment.id)
      toast.success('Cita cancelada')
      onSaved()
      onClose()
    } catch {
      toast.error('Error al cancelar')
    } finally {
      setLoading(false)
    }
  }

  const title =
    mode === 'create' ? 'Nueva Cita' :
      mode === 'reschedule' ? 'Reagendar Cita' :
        'Detalle de Cita'

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">

      {/* VIEW mode */}
      {mode === 'view' && appointment && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: `${STATUS_COLORS[appointment.status]}22`, color: STATUS_COLORS[appointment.status], border: `1px solid ${STATUS_COLORS[appointment.status]}33` }}
            >
              {STATUS_LABELS[appointment.status]}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              #{appointment.id}
            </span>
          </div>

          <div className="grid gap-3">
            <InfoRow icon={<User size={14} />} label="Barbero" value={appointment.barber_name} />
            <InfoRow icon={<User size={14} />} label="Cliente" value={appointment.client_name || '—'} />
            <InfoRow icon={<Scissors size={14} />} label="Servicio" value={`${appointment.service_name} (${appointment.duration_minutes} min)`} />
            <InfoRow icon={<Calendar size={14} />} label="Fecha" value={fmt.date(appointment.scheduled_at)} />
            <InfoRow icon={<Clock size={14} />} label="Horario" value={`${fmtTime(appointment.scheduled_at)} – ${fmtTime(appointment.end_at)}`} />
            {appointment.notes && (
              <InfoRow icon={<Clock size={14} />} label="Notas" value={appointment.notes} />
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
            {appointment.status !== 'cancelled' && appointment.status !== 'completed' && appointment.status !== 'no_show' && (
              <>
                {appointment.status === 'pending' && (
                  <ActionBtn icon={<CheckCircle size={14} />} label="Confirmar" color="#60a5fa"
                    onClick={() => handleStatusChange('confirmed')} disabled={loading} />
                )}
                {appointment.status === 'confirmed' && (
                  <ActionBtn icon={<CheckCircle size={14} />} label="Completar" color="#4ade80"
                    onClick={() => handleStatusChange('completed')} disabled={loading} />
                )}
                <ActionBtn icon={<AlertCircle size={14} />} label="No asistió" color="#9ca3af"
                  onClick={() => handleStatusChange('no_show')} disabled={loading} />
                <ActionBtn icon={<RefreshCw size={14} />} label="Reagendar" color="var(--gold-400)"
                  onClick={() => onReschedule ? onReschedule(appointment) : onClose()} disabled={loading} />
                <ActionBtn icon={<XCircle size={14} />} label="Cancelar" color="#f87171"
                  onClick={handleCancel} disabled={loading} />
              </>
            )}
            <a
              href={buildGCalUrl(appointment)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-opacity duration-150 hover:opacity-80"
              style={{ background: 'rgba(194, 244, 66, 0.12)', color: '#c2f442ff', border: '1px solid rgba(66,133,244,0.25)' }}
            >
              <CalendarPlus size={14} /> Agregar a Google Calendar
            </a>
          </div>
        </div>
      )}

      {/* CREATE mode */}
      {mode === 'create' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className="input w-full" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Hora *</label>
              <select className="input w-full" value={time} onChange={e => setTime(e.target.value)}>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Barbero *</label>
            <select className="input w-full" value={barberId} onChange={e => setBarberId(e.target.value)}>
              <option value="">Seleccionar barbero</option>
              {barbers.map(b => (
                <option key={b.id} value={b.id}>{b.name} {b.lastname}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Servicio *</label>
            <select className="input w-full" value={serviceId} onChange={e => setServiceId(e.target.value)}>
              <option value="">Seleccionar servicio</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.duration ?? 30} min)</option>
              ))}
            </select>
          </div>

          {serviceId && time && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ background: 'rgba(200,134,14,0.08)', color: 'var(--gold-400)', border: '1px solid rgba(200,134,14,0.2)' }}>
              <Clock size={12} />
              <span>{time} – {computeEndTime()} · {duration} min</span>
            </div>
          )}

          <div>
            <label className="label">Cliente <span style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
            <select className="input w-full" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Sin cliente asignado</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.lastname}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notas <span style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
            <textarea
              className="input w-full resize-none"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Preferencias, indicaciones..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={onClose} disabled={loading}>Cancelar</button>
            <button className="btn-primary flex-1" onClick={handleCreate} disabled={loading}>
              {loading ? 'Guardando...' : 'Crear Cita'}
            </button>
          </div>
        </div>
      )}

      {/* RESCHEDULE mode */}
      {mode === 'reschedule' && appointment && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
            <User size={12} style={{ color: 'var(--text-muted)' }} />
            <span>{appointment.barber_name}</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <Scissors size={12} style={{ color: 'var(--text-muted)' }} />
            <span>{appointment.service_name}</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span>{appointment.duration_minutes} min</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nueva fecha *</label>
              <input type="date" className="input w-full" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Nueva hora *</label>
              <select className="input w-full" value={time} onChange={e => setTime(e.target.value)}>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {time && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ background: 'rgba(200,134,14,0.08)', color: 'var(--gold-400)', border: '1px solid rgba(200,134,14,0.2)' }}>
              <Clock size={12} />
              <span>{time} – {computeEndTime()} · {appointment.duration_minutes} min</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={onClose} disabled={loading}>Cancelar</button>
            <button className="btn-primary flex-1" onClick={handleReschedule} disabled={loading}>
              {loading ? 'Guardando...' : 'Reagendar'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/**
 * Convert an ISO datetime string into the Google Calendar datetime format `YYYYMMDDTHHMMSSZ`.
 *
 * @param iso - An ISO 8601 datetime string or any value accepted by the Date constructor
 * @returns The input datetime formatted as `YYYYMMDDTHHMMSSZ` (UTC)
 */
function toGCalDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Builds a Google Calendar "Create Event" URL populated with appointment details.
 *
 * @param appt - Appointment whose fields (service name, client name, barber name, duration, notes, scheduled_at, end_at) are used to populate the calendar entry
 * @returns A URL string that opens Google Calendar's event creation form with the appointment title, start/end datetimes, and a details body
 */
function buildGCalUrl(appt: Appointment): string {
  const text = appt.client_name
    ? `${appt.service_name} – ${appt.client_name}`
    : appt.service_name

  const details = [
    `Barbero: ${appt.barber_name}`,
    appt.client_name ? `Cliente: ${appt.client_name}` : null,
    `Duración: ${appt.duration_minutes} min`,
    appt.notes ? `Notas: ${appt.notes}` : null,
  ].filter(Boolean).join('\n')

  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  return (
    `${base}` +
    `&text=${encodeURIComponent(text)}` +
    `&dates=${toGCalDate(appt.scheduled_at)}/${toGCalDate(appt.end_at)}` +
    `&details=${encodeURIComponent(details)}`
  )
}

/**
 * Format an ISO datetime string to a UTC time in `HH:MM` format.
 *
 * @param iso - The ISO 8601 datetime string to format
 * @returns The UTC time portion formatted as `HH:MM`
 */
function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/**
 * Render a compact information row with an icon, a muted label, and a primary-value line.
 *
 * @param icon - Visual element displayed at the start of the row
 * @param label - Small, muted descriptor text shown above the value
 * @param value - Primary text displayed prominently below the label
 * @returns A JSX element representing the labeled info row
 */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span style={{ color: 'var(--text-muted)', marginTop: 2 }}>{icon}</span>
      <div>
        <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  )
}

/**
 * Renders a compact action button that displays an icon and label with themed coloring and disabled styling.
 *
 * @param icon - Icon node rendered to the left of the label
 * @param label - Text shown inside the button
 * @param color - Base color used for text, border, and subtle background tint
 * @param onClick - Click handler invoked when the button is pressed
 * @param disabled - When true, disables interaction and applies disabled styles
 * @returns The button element with icon, label, and theme-aware styles
 */
function ActionBtn({ icon, label, color, onClick, disabled }: {
  icon: React.ReactNode; label: string; color: string; onClick: () => void; disabled: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-opacity duration-150 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}
    >
      {icon} {label}
    </button>
  )
}
