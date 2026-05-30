import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, User } from 'lucide-react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import {
  format, parse, startOfWeek, getDay,
  addDays, subDays, startOfDay, endOfDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import CitaModal from '../components/citas/CitaModal'
import { appointmentsApi, barbersApi } from '../services/api'
import type { Appointment, Barber } from '../types'

import 'react-big-calendar/lib/css/react-big-calendar.css'

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--gold-400)',
  confirmed: '#60a5fa',
  completed: '#4ade80',
  cancelled: '#f87171',
  no_show: '#9ca3af',
}

const STATUS_BG: Record<string, string> = {
  pending: 'rgba(200,134,14,0.18)',
  confirmed: 'rgba(96,165,250,0.18)',
  completed: 'rgba(74,222,128,0.18)',
  cancelled: 'rgba(248,113,113,0.18)',
  no_show: 'rgba(156,163,175,0.18)',
}

type ModalState = {
  open: boolean
  mode: 'create' | 'view' | 'reschedule'
  appointment: Appointment | null
  defaultDate?: string
  defaultTime?: string
  defaultBarberId?: number
}

const CLOSED: ModalState = { open: false, mode: 'create', appointment: null }

// Setup localizer for react-big-calendar
const locales = {
  'es': es,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

/**
 * Format a Date as an ISO date string in the `yyyy-MM-dd` format using local time.
 */
function isoDate(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

/**
 * Format an ISO date/time string into an `HH:mm` time using UTC hours and minutes.
 */
function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/**
 * Custom Resource Header component showing barber avatar and name.
 */
function ResourceHeader({ resource }: { resource: any }) {
  const barber = resource as Barber
  return (
    <div className="flex flex-col items-center py-3 gap-2">
      <div
        className="w-14 h-14 rounded-full overflow-hidden border-2 bg-neutral-800 flex items-center justify-center font-bold shadow-lg transition-transform hover:scale-105"
        style={{ borderColor: 'var(--gold-400)' }}
      >
        {barber.photo_url ? (
          <img src={barber.photo_url} alt={barber.name} className="w-full h-full object-cover" />
        ) : (
          <span style={{ color: 'var(--gold-400)' }} className="text-lg">
            {barber.name[0].toUpperCase()}
          </span>
        )}
      </div>
      <span className="text-xs font-semibold tracking-wide text-neutral-200 truncate max-w-[120px]">
        {barber.name} {barber.lastname[0]}.
      </span>
    </div>
  )
}

/**
 * Custom Event component rendering styled cards with left status borders and translucent backgrounds.
 */
function EventComponent({ event }: { event: any }) {
  const a = event.appointment as Appointment
  const status = a.status
  const isKnownStatus =
    status === 'pending' ||
    status === 'confirmed' ||
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'no_show'
  const statusColor = isKnownStatus ? STATUS_COLORS[status] : 'var(--gold-400)'
  const statusBg = isKnownStatus ? STATUS_BG[status] : 'rgba(200,134,14,0.18)'

  return (
    <div
      className="h-full w-full rounded-xl text-left px-2.5 py-1.5 flex flex-col justify-between overflow-hidden shadow-sm"
      style={{
        background: statusBg,
        borderLeft: `3px solid ${statusColor}`,
        color: statusColor,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div className="min-w-0">
        <div className="font-bold text-[10px] sm:text-[11px] truncate leading-tight">
          {fmtTime(a.scheduled_at)} – {fmtTime(a.end_at)}
        </div>
        <div className="font-semibold text-xs truncate mt-0.5" style={{ color: 'var(--text-primary)' }}>
          {a.client_name || '(Sin cliente)'}
        </div>
        <div className="text-[10px] opacity-75 truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {a.service_name}
        </div>
      </div>
      {a.notes && (
        <div className="text-[9px] opacity-60 truncate mt-1 italic" style={{ color: 'var(--text-secondary)' }}>
          "{a.notes}"
        </div>
      )}
    </div>
  )
}

export default function CitasCalendarDiario() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<ModalState>(CLOSED)

  const dateRange = useMemo(() => {
    return { start: startOfDay(currentDate), end: endOfDay(currentDate) }
  }, [currentDate])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [apptsRes, barbersRes] = await Promise.all([
        appointmentsApi.list({
          date_from: dateRange.start.toISOString(),
          date_to: dateRange.end.toISOString(),
          page_size: 500,
        }),
        barbersApi.list({ active_only: true }),
      ])
      setAppointments(apptsRes.data.items ?? [])
      setBarbers(barbersRes.data as Barber[])
    } catch {
      toast.error('Error al cargar datos de agenda')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Convert appointment schedule times into local timezone-safe equivalents matching their UTC numbers
  const events = useMemo(() => {
    return appointments.map((a) => {
      const dStart = new Date(a.scheduled_at)
      const dEnd = new Date(a.end_at)
      return {
        id: a.id,
        title: a.client_name || '(Sin cliente)',
        start: new Date(
          dStart.getUTCFullYear(),
          dStart.getUTCMonth(),
          dStart.getUTCDate(),
          dStart.getUTCHours(),
          dStart.getUTCMinutes(),
          0
        ),
        end: new Date(
          dEnd.getUTCFullYear(),
          dEnd.getUTCMonth(),
          dEnd.getUTCDate(),
          dEnd.getUTCHours(),
          dEnd.getUTCMinutes(),
          0
        ),
        resourceId: a.barber_id,
        appointment: a,
      }
    })
  }, [appointments])

  const prev = () => setCurrentDate((d) => subDays(d, 1))
  const next = () => setCurrentDate((d) => addDays(d, 1))

  const formattedTitle = useMemo(() => {
    return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
  }, [currentDate])

  const handleReschedule = (appointment: Appointment) => {
    setModal({ open: true, mode: 'reschedule', appointment })
  }

  // Workday limits (7:00 AM to 10:00 PM)
  const minTime = useMemo(() => new Date(1972, 0, 1, 7, 0, 0), [])
  const maxTime = useMemo(() => new Date(1972, 0, 1, 22, 0, 0), [])

  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date; resourceId?: any }) => {
      const dateStr = format(slotInfo.start, 'yyyy-MM-dd')
      const timeStr = format(slotInfo.start, 'HH:mm')
      setModal({
        open: true,
        mode: 'create',
        appointment: null,
        defaultDate: dateStr,
        defaultTime: timeStr,
        defaultBarberId: slotInfo.resourceId ? Number(slotInfo.resourceId) : undefined,
      })
    },
    []
  )

  const handleSelectEvent = useCallback((event: any) => {
    setModal({ open: true, mode: 'view', appointment: event.appointment })
  }, [])

  return (
    <div className="p-6 space-y-5">
      {/* Dynamic inline overrides for react-big-calendar to match Dark Glass Theme */}
      <style>{`
        .rbc-calendar {
          background-color: var(--surface-1) !important;
          color: var(--text-primary) !important;
          border-radius: 1rem !important;
          border: 1px solid var(--surface-border) !important;
          font-family: 'Inter', system-ui, sans-serif !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
        }

        .rbc-time-view {
          border: 1px solid var(--surface-border) !important;
          background-color: var(--surface-1) !important;
          border-radius: 1rem !important;
          overflow: hidden !important;
        }

        .rbc-time-header {
          border-bottom: 1px solid var(--surface-border) !important;
          background-color: var(--surface-1) !important;
        }

        .rbc-time-header-content {
          border-left: 1px solid var(--surface-border) !important;
        }

        .rbc-header {
          border-bottom: none !important;
          background-color: transparent !important;
          color: var(--text-primary) !important;
        }

        .rbc-header + .rbc-header {
          border-left: 1px solid var(--surface-border) !important;
        }

        .rbc-time-gutter,
        .rbc-time-header-gutter {
          width: 48px !important;
          min-width: 48px !important;
          border-right: 1px solid var(--surface-border) !important;
        }

        .rbc-time-gutter {
          background-color: var(--surface-1) !important;
        }

        .rbc-time-gutter .rbc-time-column {
          color: var(--text-secondary) !important;
          font-size: 10px !important;
          font-weight: 500 !important;
          text-align: right !important;
          padding-right: 6px !important;
        }

        @media (max-width: 640px) {
          .rbc-time-gutter,
          .rbc-time-header-gutter {
            width: 38px !important;
            min-width: 38px !important;
          }
          .rbc-time-gutter .rbc-time-column {
            font-size: 9px !important;
            padding-right: 4px !important;
          }
          .rbc-label {
            font-size: 9px !important;
          }
        }

        .rbc-timeslot-group {
          border-bottom: 1px solid var(--surface-border) !important;
          min-height: 200px !important;
        }

        .rbc-time-slot {
          border-top: 1px solid rgba(255, 255, 255, 0.02) !important;
        }

        .rbc-day-slot {
          background-color: transparent !important;
        }

        .rbc-day-slot + .rbc-day-slot {
          border-left: 1px solid var(--surface-border) !important;
        }

        .rbc-today {
          background-color: rgba(200, 134, 14, 0.01) !important;
        }

        .rbc-current-time-indicator {
          background-color: var(--gold-400) !important;
          height: 2px !important;
        }

        .rbc-event {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0px 4px !important;
        }

        .rbc-event:focus {
          outline: none !important;
        }

        .rbc-event-content {
          padding: 0 !important;
          height: 100% !important;
        }

        .rbc-event-label {
          display: none !important;
        }

        .rbc-time-header-gutter {
          border-bottom: none !important;
          background-color: var(--surface-1) !important;
        }

        .rbc-label {
          color: var(--text-secondary) !important;
          font-size: 10px !important;
        }
      `}</style>

      {/* ── Header / Controls ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button className="btn-icon" onClick={prev} aria-label="Día anterior">
            <ChevronLeft size={16} />
          </button>
          <h2
            className="font-semibold text-lg capitalize"
            style={{ color: 'var(--text-primary)', minWidth: '16rem' }}
          >
            {formattedTitle}
          </h2>
          <button className="btn-icon" onClick={next} aria-label="Día siguiente">
            <ChevronRight size={16} />
          </button>
          <button
            className="btn-secondary text-xs py-1.5 px-3"
            onClick={() => setCurrentDate(new Date())}
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-3">
          {loading && (
            <div
              className="animate-spin rounded-full h-4 w-4 border-2 border-transparent"
              style={{ borderTopColor: 'var(--gold-500)', borderRightColor: 'rgba(200,134,14,0.3)' }}
            />
          )}
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setModal({ open: true, mode: 'create', appointment: null })}
          >
            <Plus size={14} /> Nueva Cita
          </button>
        </div>
      </div>

      {/* ── Calendar Grid ── */}
      {barbers.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}
        >
          <CalendarDays
            size={40}
            className="mx-auto mb-3 animate-pulse"
            style={{ color: 'var(--text-muted)', opacity: 0.3 }}
          />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No se encontraron barberos activos para cargar en la agenda.
          </p>
        </div>
      ) : (
        <div style={{ height: '70vh' }} className="fade-in">
          <Calendar
            localizer={localizer}
            events={events}
            defaultView={Views.DAY}
            views={[Views.DAY]}
            step={15}
            timeslots={4}
            min={minTime}
            max={maxTime}
            date={currentDate}
            onNavigate={(date) => setCurrentDate(date)}
            resources={barbers}
            resourceIdAccessor="id"
            resourceTitleAccessor="name"
            selectable={true}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            toolbar={false}
            components={{
              resourceHeader: ResourceHeader,
              event: EventComponent,
            }}
            messages={{
              noEventsInRange: 'Sin citas en este horario.',
            }}
          />
        </div>
      )}

      {/* ── Appointment Action Modal ── */}
      <CitaModal
        open={modal.open}
        onClose={() => setModal(CLOSED)}
        mode={modal.mode}
        appointment={modal.appointment}
        defaultDate={modal.defaultDate}
        defaultTime={modal.defaultTime}
        defaultBarberId={modal.defaultBarberId}
        onSaved={loadData}
        onReschedule={handleReschedule}
      />
    </div>
  )
}
