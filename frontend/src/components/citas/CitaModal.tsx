import { useState, useEffect, useCallback } from 'react'
import { Clock, User, Scissors, Calendar, RefreshCw, XCircle, CheckCircle, AlertCircle, CalendarPlus, Share2, Copy, Check, X } from 'lucide-react'
import QRCode from 'react-qr-code'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import { appointmentsApi, barbersApi, clientsApi, catalogApi, companiesApi } from '../../services/api'
import { bookingApi } from '../../services/publicApi'
import { fmt } from '../../utils/format'
import type { Appointment, Barber, Client, ServiceCatalog, Company } from '../../types'
import type { SlotPublic } from '../../services/publicApi'


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
  const [company, setCompany] = useState<Company | null>(null)
  const [slots, setSlots] = useState<SlotPublic[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [barberId, setBarberId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState(defaultTime || '')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showShare, setShowShare] = useState(false)

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
      const [b, c, s, comp] = await Promise.all([
        barbersApi.list({ active_only: true }),
        clientsApi.list({ active_only: true }),
        catalogApi.services({ active_only: true }),
        companiesApi.getMe(),
      ])
      setBarbers(b.data as Barber[])
      setClients(c.data as Client[])
      setServices(s.data as ServiceCatalog[])
      setCompany(comp.data as Company)
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
      setTime(defaultTime || '')
      setNotes('')
    }
    if (open && mode === 'reschedule' && appointment) {
      const dt = new Date(appointment.scheduled_at)
      setDate(dt.toISOString().slice(0, 10))
      setTime(`${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`)
    }
  }, [open, mode, appointment, defaultDate, defaultTime])

  useEffect(() => {
    const activeBarberId = mode === 'reschedule' ? appointment?.barber_id : Number(barberId)
    const activeServiceId = mode === 'reschedule' ? appointment?.service_id : Number(serviceId)
    const slug = company?.slug

    if (!slug || !activeBarberId || !activeServiceId || !date) {
      setSlots([])
      return
    }

    setLoadingSlots(true)
    setSlots([])
    bookingApi
      .getSlots(slug, { barber_id: activeBarberId, date, service_id: activeServiceId })
      .then((r) => {
        setSlots(r.data)
      })
      .catch(() => {
        setSlots([])
      })
      .finally(() => {
        setLoadingSlots(false)
      })
  }, [company?.slug, barberId, serviceId, date, mode, appointment])

  const displaySlots = (() => {
    if (mode !== 'reschedule' || !appointment) return slots

    const apptDt = new Date(appointment.scheduled_at)
    const apptDateStr = apptDt.toISOString().slice(0, 10)
    const apptTimeStr = `${String(apptDt.getUTCHours()).padStart(2, '0')}:${String(apptDt.getUTCMinutes()).padStart(2, '0')}`

    if (date === apptDateStr && !slots.some(s => s.time === apptTimeStr)) {
      const newSlot: SlotPublic = {
        time: apptTimeStr,
        datetime: appointment.scheduled_at
      }
      const combined = [...slots, newSlot]
      return combined.sort((a, b) => a.time.localeCompare(b.time))
    }

    return slots
  })()

  useEffect(() => {
    if (displaySlots.length > 0) {
      const exists = displaySlots.some(s => s.time === time)
      if (!exists) {
        setTime(displaySlots[0].time)
      }
    } else if (!loadingSlots) {
      setTime('')
    }
  }, [displaySlots, loadingSlots])

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
            <div className="flex items-center gap-2">
              {appointment.code && (
                <span
                  className="text-xs font-mono font-bold tracking-widest px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(200,134,14,0.10)', color: 'var(--gold-400)', border: '1px solid rgba(200,134,14,0.25)' }}
                >
                  {appointment.code}
                </span>
              )}
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                #{appointment.id}
              </span>
            </div>
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
            {appointment.code && (
              <div className="relative">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ background: 'rgba(200,134,14,0.12)', color: 'var(--gold-400)', border: '1px solid rgba(200,134,14,0.25)' }}
                  onClick={() => setShowShare(v => !v)}
                >
                  <Share2 size={14} /> Compartir
                </button>
                {showShare && (
                  <SharePopover code={appointment.code} onClose={() => setShowShare(false)} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE mode */}
      {mode === 'create' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div>
            <label className="label">Fecha *</label>
            <input type="date" className="input w-full" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Clock size={14} style={{ color: 'var(--gold-400)' }} />
              <span>Horarios Disponibles *</span>
              {selectedService && (
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full" style={{ background: 'rgba(200,134,14,0.1)', color: 'var(--gold-400)', border: '1px solid rgba(200,134,14,0.2)' }}>
                  {duration} min
                </span>
              )}
            </label>

            {loadingSlots ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
                ))}
              </div>
            ) : !barberId || !serviceId ? (
              <div className="text-center py-5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px dashed var(--surface-border)' }}>
                <Clock size={16} className="opacity-60" style={{ color: 'var(--gold-400)' }} />
                <span>Selecciona barbero y servicio para ver horarios disponibles</span>
              </div>
            ) : displaySlots.length === 0 ? (
              <div className="text-center py-5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5" style={{ background: 'rgba(239, 68, 68, 0.05)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <AlertCircle size={16} className="text-red-400" />
                <span>No hay horarios disponibles para esta fecha. Intenta otro día.</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-0.5 pr-1 scrollbar-thin scrollbar-thumb-gold-400">
                {displaySlots.map((slot) => {
                  const isSelected = slot.time === time
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setTime(slot.time)}
                      className="py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 text-center"
                      style={{
                        background: isSelected ? 'var(--gold-400)' : 'var(--surface-2)',
                        color: isSelected ? '#000' : 'var(--text-secondary)',
                        border: isSelected ? '1px solid var(--gold-400)' : '1px solid var(--surface-border)',
                        boxShadow: isSelected ? '0 0 12px rgba(228,162,37,0.25)' : 'none',
                      }}
                    >
                      {slot.time}
                    </button>
                  )
                })}
              </div>
            )}
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

          <div>
            <label className="label">Nueva fecha *</label>
            <input type="date" className="input w-full" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Clock size={14} style={{ color: 'var(--gold-400)' }} />
              <span>Horarios Disponibles *</span>
            </label>

            {loadingSlots ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
                ))}
              </div>
            ) : displaySlots.length === 0 ? (
              <div className="text-center py-5 rounded-xl text-xs flex flex-col items-center justify-center gap-1.5" style={{ background: 'rgba(239, 68, 68, 0.05)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <AlertCircle size={16} className="text-red-400" />
                <span>No hay horarios disponibles para esta fecha. Intenta otro día.</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-0.5 pr-1 scrollbar-thin scrollbar-thumb-gold-400">
                {displaySlots.map((slot) => {
                  const isSelected = slot.time === time
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setTime(slot.time)}
                      className="py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 text-center"
                      style={{
                        background: isSelected ? 'var(--gold-400)' : 'var(--surface-2)',
                        color: isSelected ? '#000' : 'var(--text-secondary)',
                        border: isSelected ? '1px solid var(--gold-400)' : '1px solid var(--surface-border)',
                        boxShadow: isSelected ? '0 0 12px rgba(228,162,37,0.25)' : 'none',
                      }}
                    >
                      {slot.time}
                    </button>
                  )
                })}
              </div>
            )}
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

function SharePopover({ code, onClose }: { code: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/barberia/mi-cita/${code}`

  function copyUrl() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-5 rounded-2xl p-6 w-full"
        style={{
          maxWidth: 320,
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer transition-opacity hover:opacity-70"
          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>

        <div>
          <p className="text-sm font-semibold text-center mb-0.5" style={{ color: 'var(--text-primary)' }}>
            Compartir cita
          </p>
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            Escanea el QR o copia el enlace
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white shadow-inner">
          <QRCode value={url} size={180} />
        </div>

        <div
          className="w-full rounded-lg px-3 py-2 text-center"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}
        >
          <p className="text-xs font-mono break-all" style={{ color: 'var(--text-muted)' }}>
            {url}
          </p>
        </div>

        <button
          onClick={copyUrl}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-85"
          style={{
            background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(200,134,14,0.15)',
            color: copied ? '#4ade80' : 'var(--gold-400)',
            border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'rgba(200,134,14,0.3)'}`,
            transition: 'background 0.2s, color 0.2s, border-color 0.2s',
          }}
        >
          {copied
            ? <><Check size={15} /> Copiado!</>
            : <><Copy size={15} /> Copiar enlace</>
          }
        </button>
      </div>
    </div>
  )
}
