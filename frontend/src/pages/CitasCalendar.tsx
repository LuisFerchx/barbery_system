import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfDay, endOfDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import CitaModal from '../components/citas/CitaModal'
import { appointmentsApi } from '../services/api'
import type { Appointment } from '../types'

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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

type CalendarView = 'month' | 'three-day' | 'week' | 'day' | 'agenda'

type ModalState = {
  open: boolean
  mode: 'create' | 'view' | 'reschedule'
  appointment: Appointment | null
  defaultDate?: string
}

const CLOSED: ModalState = { open: false, mode: 'create', appointment: null }
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const HOUR_HEIGHT = 64
const DAY_HOUR_HEIGHT = 120
const START_HOUR = 7
const END_HOUR = 22
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

/**
 * Format a Date as an ISO date string in the `yyyy-MM-dd` format using local time.
 *
 * @param d - The Date to format
 * @returns The date formatted as `yyyy-MM-dd`
 */
function isoDate(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

/**
 * Format an ISO date/time string into an `HH:mm` time using UTC hours and minutes.
 *
 * @param iso - An ISO-8601 datetime string (or any string parseable by `Date`); interpreted in UTC
 * @returns The time portion formatted as `HH:mm` (UTC)
 */
function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/**
 * Compute the vertical pixel offset for an appointment's start time within the calendar time grid.
 *
 * @param iso - ISO 8601 datetime string for the appointment start (interpreted in UTC)
 * @returns The top offset in pixels from the start of the visible grid; `0` if the time is before `START_HOUR`
 */
function apptTopPx(iso: string, hourHeight: number = HOUR_HEIGHT): number {
  const d = new Date(iso)
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes() - START_HOUR * 60
  return Math.max(0, (mins / 60) * hourHeight)
}

/**
 * Compute the vertical height in pixels for an appointment block based on its duration.
 *
 * @param durationMinutes - Appointment duration in minutes
 * @returns The height in pixels, with a minimum of `22` px
 */
function apptHeightPx(durationMinutes: number, hourHeight: number = HOUR_HEIGHT): number {
  return Math.max(22, (durationMinutes / 60) * hourHeight)
}

interface PositionedAppointment {
  appointment: Appointment
  left: number
  width: number
}

/**
 * Computes non-overlapping positions for a list of appointments on a single day.
 * It uses a standard calendar grid layout algorithm to group overlapping
 * appointments into clusters and assign column indices.
 *
 * @param dayAppts - List of appointments for a single day
 * @returns List of positioned appointments with left and width percentages
 */
function computePositionedAppointments(dayAppts: Appointment[]): PositionedAppointment[] {
  if (dayAppts.length === 0) return []

  // Sort appointments by start time, and then by end time descending (longer ones first)
  const sorted = [...dayAppts].sort((a, b) => {
    const aStart = new Date(a.scheduled_at).getTime()
    const bStart = new Date(b.scheduled_at).getTime()
    if (aStart !== bStart) return aStart - bStart

    const aEnd = a.end_at ? new Date(a.end_at).getTime() : aStart + a.duration_minutes * 60 * 1000
    const bEnd = b.end_at ? new Date(b.end_at).getTime() : bStart + b.duration_minutes * 60 * 1000
    return bEnd - aEnd
  })

  const clusters: Appointment[][] = []
  let currentCluster: Appointment[] = []
  let clusterMaxEnd = 0

  for (const appt of sorted) {
    const start = new Date(appt.scheduled_at).getTime()
    const durationMs = appt.duration_minutes * 60 * 1000
    const end = appt.end_at ? new Date(appt.end_at).getTime() : start + durationMs

    if (currentCluster.length > 0 && start >= clusterMaxEnd) {
      clusters.push(currentCluster)
      currentCluster = []
      clusterMaxEnd = 0
    }

    currentCluster.push(appt)
    clusterMaxEnd = Math.max(clusterMaxEnd, end)
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster)
  }

  const result: PositionedAppointment[] = []

  for (const cluster of clusters) {
    const columns: number[] = [] // stores the end time of the last appointment in each column
    const apptColumnIndices: Map<number, number> = new Map()

    for (const appt of cluster) {
      const start = new Date(appt.scheduled_at).getTime()
      const durationMs = appt.duration_minutes * 60 * 1000
      const end = appt.end_at ? new Date(appt.end_at).getTime() : start + durationMs

      let colIndex = -1
      for (let i = 0; i < columns.length; i++) {
        if (columns[i] <= start) {
          colIndex = i
          break
        }
      }

      if (colIndex === -1) {
        columns.push(end)
        colIndex = columns.length - 1
      } else {
        columns[colIndex] = end
      }

      apptColumnIndices.set(appt.id, colIndex)
    }

    const totalCols = columns.length
    for (const appt of cluster) {
      const colIndex = apptColumnIndices.get(appt.id) ?? 0
      const width = 100 / totalCols
      const left = colIndex * width
      result.push({
        appointment: appt,
        left,
        width,
      })
    }
  }

  return result
}

/**
 * Render the current time indicator line positioned within the calendar's hour grid.
 *
 * @returns A DOM element showing a horizontal line with a small circular marker at the current UTC time relative to `START_HOUR`–`END_HOUR`, or `null` if the current time falls outside the visible grid.
 */
function TodayLine({ hourHeight = HOUR_HEIGHT }: { hourHeight?: number }) {
  const now = new Date()
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes() - START_HOUR * 60
  const top = (mins / 60) * hourHeight
  if (top < 0 || top > (END_HOUR - START_HOUR) * hourHeight) return null
  return (
    <div className="absolute w-full pointer-events-none" style={{ top, zIndex: 3 }}>
      <div
        className="absolute rounded-full"
        style={{ background: 'var(--gold-400)', width: 8, height: 8, left: -4, top: -4 }}
      />
      <div className="h-px w-full" style={{ background: 'var(--gold-400)', opacity: 0.8 }} />
    </div>
  )
}

/**
 * Render a compact legend of appointment statuses with colored dots and labels.
 *
 * @returns A JSX element containing a row of colored indicators and their corresponding status labels.
 */
function Legend() {
  return (
    <div className="flex flex-wrap gap-4">
      {Object.entries(STATUS_LABELS).map(([k, label]) => (
        <div key={k} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[k] }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Renders an appointments calendar with month, week, day, and agenda views.
 *
 * The component provides navigation, date-range-aware appointment loading and grouping,
 * a status legend, and controls to create, view, or reschedule appointments via a modal.
 *
 * @returns A JSX element representing the appointments calendar UI
 */
export default function CitasCalendar() {
  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<ModalState>(CLOSED)

  const dateRange = useMemo(() => {
    switch (view) {
      case 'month':
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) }
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        }
      case 'three-day':
        return {
          start: startOfDay(currentDate),
          end: endOfDay(addDays(currentDate, 2)),
        }
      case 'day':
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) }
      case 'agenda':
        return { start: startOfDay(new Date()), end: addDays(new Date(), 14) }
    }
  }, [view, currentDate])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await appointmentsApi.list({
        date_from: dateRange.start.toISOString(),
        date_to: dateRange.end.toISOString(),
        page_size: 500,
      })
      setAppointments(res.data.items ?? [])
    } catch {
      toast.error('Error al cargar citas')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => { load() }, [load])

  const byDate = useMemo(() =>
    appointments.reduce<Record<string, Appointment[]>>((acc, a) => {
      const d = new Date(a.scheduled_at)
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
        ; (acc[key] ??= []).push(a)
      return acc
    }, {}),
    [appointments])

  const prev = () => {
    if (view === 'month') setCurrentDate(d => subMonths(d, 1))
    else if (view === 'three-day') setCurrentDate(d => subDays(d, 3))
    else if (view === 'week') setCurrentDate(d => subWeeks(d, 1))
    else if (view === 'day') setCurrentDate(d => subDays(d, 1))
  }
  const next = () => {
    if (view === 'month') setCurrentDate(d => addMonths(d, 1))
    else if (view === 'three-day') setCurrentDate(d => addDays(d, 3))
    else if (view === 'week') setCurrentDate(d => addWeeks(d, 1))
    else if (view === 'day') setCurrentDate(d => addDays(d, 1))
  }

  const title = useMemo(() => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy', { locale: es })
    if (view === 'three-day') {
      const de = addDays(currentDate, 2)
      return currentDate.getMonth() === de.getMonth()
        ? `${format(currentDate, 'd')} – ${format(de, 'd MMM yyyy', { locale: es })}`
        : `${format(currentDate, 'd MMM', { locale: es })} – ${format(de, 'd MMM yyyy', { locale: es })}`
    }
    if (view === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
      const we = endOfWeek(currentDate, { weekStartsOn: 1 })
      return ws.getMonth() === we.getMonth()
        ? `${format(ws, 'd')} – ${format(we, 'd MMM yyyy', { locale: es })}`
        : `${format(ws, 'd MMM', { locale: es })} – ${format(we, 'd MMM yyyy', { locale: es })}`
    }
    if (view === 'day') return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
    return 'Próximas citas'
  }, [view, currentDate])

  const handleReschedule = (appointment: Appointment) => {
    setModal({ open: true, mode: 'reschedule', appointment })
  }

  // Derived data
  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
  })
  const threeDays = eachDayOfInterval({
    start: startOfDay(currentDate),
    end: endOfDay(addDays(currentDate, 2)),
  })
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  })
  const agendaDays = eachDayOfInterval({
    start: startOfDay(new Date()),
    end: addDays(new Date(), 13),
  }).filter(d => (byDate[isoDate(d)] || []).length > 0)

  const VIEW_TABS: { key: CalendarView; label: string }[] = [
    { key: 'month', label: 'Mes' },
    { key: 'three-day', label: '3 Días' },
    { key: 'week', label: 'Semana' },
    { key: 'day', label: 'Día' },
    { key: 'agenda', label: 'Agenda' },
  ]

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Date Navigator */}
        <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
          {view !== 'agenda' && (
            <div className="flex items-center gap-3 w-full justify-between md:justify-start">
              <div className="flex items-center gap-1.5">
                <button className="btn-icon" onClick={prev} aria-label="Anterior">
                  <ChevronLeft size={16} />
                </button>
                <h2
                  className="font-semibold text-lg capitalize truncate"
                  style={{ color: 'var(--text-primary)', minWidth: '9rem' }}
                >
                  {title}
                </h2>
                <button className="btn-icon" onClick={next} aria-label="Siguiente">
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                className="btn-secondary text-xs py-1.5 px-3"
                onClick={() => setCurrentDate(new Date())}
              >
                Hoy
              </button>
            </div>
          )}
          {view === 'agenda' && (
            <h2 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
          )}
        </div>

        {/* View Switcher & Action Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* View switcher */}
          <div
            className="flex rounded-lg overflow-hidden w-full sm:w-auto"
            style={{ border: '1px solid var(--surface-border)' }}
          >
            {VIEW_TABS.map(({ key, label }, i) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className="text-xs py-1.5 cursor-pointer transition-colors duration-150 flex-1 sm:flex-initial text-center px-1 sm:px-3 whitespace-nowrap"
                style={{
                  background: view === key ? 'var(--gold-400)' : 'transparent',
                  color: view === key ? '#000' : 'var(--text-muted)',
                  fontWeight: view === key ? 600 : 400,
                  borderRight: i < VIEW_TABS.length - 1 ? '1px solid var(--surface-border)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            {loading ? (
              <div
                className="animate-spin rounded-full h-4 w-4 border-2 border-transparent flex-shrink-0"
                style={{ borderTopColor: 'var(--gold-500)', borderRightColor: 'rgba(200,134,14,0.3)' }}
              />
            ) : <div className="w-4 hidden sm:block" />}
            
            <button
              className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none text-xs py-1.5 px-4"
              onClick={() => setModal({ open: true, mode: 'create', appointment: null })}
            >
              <Plus size={14} /> Nueva Cita
            </button>
          </div>
        </div>

      </div>

      {/* ════════════════════════════════════════
          MONTH VIEW
      ════════════════════════════════════════ */}
      {view === 'month' && (
        <>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}
          >
            <div className="grid grid-cols-7">
              {WEEKDAYS.map(d => (
                <div
                  key={d}
                  className="py-2.5 text-center text-xs font-semibold"
                  style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--surface-border)' }}
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthDays.map((day, idx) => {
                const key = isoDate(day)
                const dayAppts = byDate[key] || []
                const inMonth = isSameMonth(day, currentDate)
                const today = isToday(day)

                return (
                  <div
                    key={key}
                    onClick={() => setModal({ open: true, mode: 'create', appointment: null, defaultDate: key })}
                    className="min-h-[100px] p-1.5 cursor-pointer transition-colors hover:bg-white/[0.02]"
                    style={{
                      borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid var(--surface-border)',
                      borderBottom: idx < monthDays.length - 7 ? '1px solid var(--surface-border)' : 'none',
                      opacity: inMonth ? 1 : 0.35,
                    }}
                  >
                    <div className="flex items-center justify-center mb-1">
                      <span
                        className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium"
                        style={today
                          ? { background: 'var(--gold-400)', color: '#000', fontWeight: 700 }
                          : { color: 'var(--text-secondary)' }
                        }
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {dayAppts.slice(0, 3).map(a => (
                        <button
                          key={a.id}
                          onClick={e => { e.stopPropagation(); setModal({ open: true, mode: 'view', appointment: a }) }}
                          className="w-full text-left px-1.5 py-0.5 rounded text-xs truncate cursor-pointer transition-opacity hover:opacity-80"
                          style={{ background: STATUS_BG[a.status], color: STATUS_COLORS[a.status] }}
                        >
                          {fmtTime(a.scheduled_at)} {a.client_name || a.barber_name}
                        </button>
                      ))}
                      {dayAppts.length > 3 && (
                        <div className="text-xs px-1.5" style={{ color: 'var(--text-muted)' }}>
                          +{dayAppts.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <Legend />
        </>
      )}

      {/* ════════════════════════════════════════
          WEEK VIEW
      ════════════════════════════════════════ */}
      {view === 'week' && (
        <>
          <div
            className="rounded-2xl overflow-x-auto"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}
          >
            <div style={{ minWidth: '1500px' }}>
              {/* Day headers */}
              <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
                <div style={{ borderBottom: '1px solid var(--surface-border)' }} />
                {weekDays.map(day => (
                  <div
                    key={isoDate(day)}
                    className="py-2.5 text-center"
                    style={{
                      borderBottom: '1px solid var(--surface-border)',
                      borderLeft: '1px solid var(--surface-border)',
                    }}
                  >
                    <div className="text-xs font-medium capitalize" style={{ color: 'var(--text-muted)' }}>
                      {format(day, 'EEE', { locale: es })}
                    </div>
                    <div
                      className="w-7 h-7 mx-auto mt-0.5 flex items-center justify-center rounded-full text-sm font-semibold cursor-pointer transition-colors"
                      onClick={() => { setCurrentDate(day); setView('day') }}
                      style={isToday(day)
                        ? { background: 'var(--gold-400)', color: '#000' }
                        : { color: 'var(--text-secondary)' }
                      }
                    >
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div className="overflow-y-auto" style={{ maxHeight: '620px' }}>
                <div className="relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                  <div
                    className="absolute inset-0 grid"
                    style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
                  >
                    {/* Hour labels */}
                    <div className="relative" style={{ borderRight: '1px solid var(--surface-border)' }}>
                      {HOURS.map(h => (
                        <div
                          key={h}
                          className="absolute pr-2 text-right w-full"
                          style={{
                            top: (h - START_HOUR) * HOUR_HEIGHT - 8,
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {String(h).padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {weekDays.map(day => {
                      const key = isoDate(day)
                      const dayAppts = byDate[key] || []
                      return (
                        <div
                          key={key}
                          className="relative cursor-pointer"
                          style={{ borderLeft: '1px solid var(--surface-border)' }}
                          onClick={() => setModal({ open: true, mode: 'create', appointment: null, defaultDate: key })}
                        >
                          {/* Hour lines */}
                          {HOURS.map(h => (
                            <div
                              key={h}
                              className="absolute w-full"
                              style={{
                                top: (h - START_HOUR) * HOUR_HEIGHT,
                                borderTop: '1px solid var(--surface-border)',
                                opacity: 0.4,
                                pointerEvents: 'none',
                              }}
                            />
                          ))}

                          {isToday(day) && <TodayLine />}

                          {computePositionedAppointments(dayAppts).map(({ appointment: a, left, width }) => (
                            <button
                              key={a.id}
                              onClick={e => { e.stopPropagation(); setModal({ open: true, mode: 'view', appointment: a }) }}
                              className="absolute rounded overflow-hidden cursor-pointer transition-opacity hover:opacity-80 text-left px-1.5"
                              style={{
                                left: `calc(${left}% + 2px)`,
                                width: `calc(${width}% - 4px)`,
                                top: apptTopPx(a.scheduled_at),
                                height: apptHeightPx(a.duration_minutes),
                                background: STATUS_BG[a.status],
                                borderLeft: `2px solid ${STATUS_COLORS[a.status]}`,
                                color: STATUS_COLORS[a.status],
                                zIndex: 2,
                                paddingTop: 2,
                                paddingBottom: 2,
                              }}
                            >
                              <div className="font-semibold truncate leading-tight" style={{ fontSize: '11px' }}>
                                {fmtTime(a.scheduled_at)} {a.client_name || '—'}
                              </div>
                              {a.duration_minutes >= 30 && (
                                <div className="truncate opacity-75 leading-tight" style={{ fontSize: '10px' }}>
                                  {a.service_name}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Legend />
        </>
      )}

      {/* ════════════════════════════════════════
          3-DAY VIEW
      ════════════════════════════════════════ */}
      {view === 'three-day' && (
        <>
          <div
            className="rounded-2xl overflow-x-auto"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}
          >
            <div style={{ minWidth: '900px' }}>
              {/* Day headers */}
              <div className="grid" style={{ gridTemplateColumns: '52px repeat(3, 1fr)' }}>
                <div style={{ borderBottom: '1px solid var(--surface-border)' }} />
                {threeDays.map(day => (
                  <div
                    key={isoDate(day)}
                    className="py-2.5 text-center"
                    style={{
                      borderBottom: '1px solid var(--surface-border)',
                      borderLeft: '1px solid var(--surface-border)',
                    }}
                  >
                    <div className="text-xs font-medium capitalize" style={{ color: 'var(--text-muted)' }}>
                      {format(day, 'EEE d', { locale: es })}
                    </div>
                    <div
                      className="w-7 h-7 mx-auto mt-0.5 flex items-center justify-center rounded-full text-sm font-semibold cursor-pointer transition-colors"
                      onClick={() => { setCurrentDate(day); setView('day') }}
                      style={isToday(day)
                        ? { background: 'var(--gold-400)', color: '#000' }
                        : { color: 'var(--text-secondary)' }
                      }
                    >
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div className="overflow-y-auto" style={{ maxHeight: '620px' }}>
                <div className="relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                  <div
                    className="absolute inset-0 grid"
                    style={{ gridTemplateColumns: '52px repeat(3, 1fr)' }}
                  >
                    {/* Hour labels */}
                    <div className="relative" style={{ borderRight: '1px solid var(--surface-border)' }}>
                      {HOURS.map(h => (
                        <div
                          key={h}
                          className="absolute pr-2 text-right w-full"
                          style={{
                            top: (h - START_HOUR) * HOUR_HEIGHT - 8,
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {String(h).padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {threeDays.map(day => {
                      const key = isoDate(day)
                      const dayAppts = byDate[key] || []
                      return (
                        <div
                          key={key}
                          className="relative cursor-pointer"
                          style={{ borderLeft: '1px solid var(--surface-border)' }}
                          onClick={() => setModal({ open: true, mode: 'create', appointment: null, defaultDate: key })}
                        >
                          {/* Hour lines */}
                          {HOURS.map(h => (
                            <div
                              key={h}
                              className="absolute w-full"
                              style={{
                                top: (h - START_HOUR) * HOUR_HEIGHT,
                                borderTop: '1px solid var(--surface-border)',
                                opacity: 0.4,
                                pointerEvents: 'none',
                              }}
                            />
                          ))}

                          {isToday(day) && <TodayLine />}

                          {computePositionedAppointments(dayAppts).map(({ appointment: a, left, width }) => (
                            <button
                              key={a.id}
                              onClick={e => { e.stopPropagation(); setModal({ open: true, mode: 'view', appointment: a }) }}
                              className="absolute rounded overflow-hidden cursor-pointer transition-opacity hover:opacity-80 text-left px-1.5"
                              style={{
                                left: `calc(${left}% + 2px)`,
                                width: `calc(${width}% - 4px)`,
                                top: apptTopPx(a.scheduled_at),
                                height: apptHeightPx(a.duration_minutes),
                                background: STATUS_BG[a.status],
                                borderLeft: `2px solid ${STATUS_COLORS[a.status]}`,
                                color: STATUS_COLORS[a.status],
                                zIndex: 2,
                                paddingTop: 2,
                                paddingBottom: 2,
                              }}
                            >
                              <div className="font-semibold truncate leading-tight" style={{ fontSize: '11px' }}>
                                {fmtTime(a.scheduled_at)} {a.client_name || '—'}
                              </div>
                              {a.duration_minutes >= 30 && (
                                <div className="truncate opacity-75 leading-tight" style={{ fontSize: '10px' }}>
                                  {a.service_name}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Legend />
        </>
      )}

      {/* ════════════════════════════════════════
          DAY VIEW
      ════════════════════════════════════════ */}
      {view === 'day' && (
        <>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}
          >
            {/* Day header */}
            <div
              className="px-4 py-3 flex items-center gap-3"
              style={{ borderBottom: '1px solid var(--surface-border)' }}
            >
              <div
                className="w-10 h-10 flex items-center justify-center rounded-full text-lg font-bold flex-shrink-0"
                style={isToday(currentDate)
                  ? { background: 'var(--gold-400)', color: '#000' }
                  : { background: 'var(--surface-2)', color: 'var(--text-primary)' }
                }
              >
                {format(currentDate, 'd')}
              </div>
              <div>
                <div className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                  {format(currentDate, 'EEEE', { locale: es })}
                </div>
                <div className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                  {format(currentDate, 'MMMM yyyy', { locale: es })}
                </div>
              </div>
              <div
                className="ml-auto text-sm font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                {(byDate[isoDate(currentDate)] || []).length} cita(s)
              </div>
            </div>

            {/* Time grid */}
            <div className="overflow-y-auto" style={{ maxHeight: '640px' }}>
              <div className="relative" style={{ height: `${HOURS.length * DAY_HOUR_HEIGHT}px` }}>
                <div
                  className="absolute inset-0"
                  style={{ display: 'grid', gridTemplateColumns: '52px 1fr' }}
                >
                  {/* Hour labels */}
                  <div className="relative" style={{ borderRight: '1px solid var(--surface-border)' }}>
                    {HOURS.map(h => (
                      <div
                        key={h}
                        className="absolute pr-2 text-right w-full"
                        style={{
                          top: (h - START_HOUR) * DAY_HOUR_HEIGHT - 8,
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {String(h).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {/* Day column */}
                  <div
                    className="relative cursor-pointer"
                    onClick={() => setModal({ open: true, mode: 'create', appointment: null, defaultDate: isoDate(currentDate) })}
                  >
                    {HOURS.map(h => (
                      <div
                        key={h}
                        className="absolute w-full"
                        style={{
                          top: (h - START_HOUR) * DAY_HOUR_HEIGHT,
                          borderTop: '1px solid var(--surface-border)',
                          opacity: 0.4,
                          pointerEvents: 'none',
                        }}
                      />
                    ))}

                    {isToday(currentDate) && <TodayLine hourHeight={DAY_HOUR_HEIGHT} />}

                    {computePositionedAppointments(byDate[isoDate(currentDate)] || []).map(({ appointment: a, left, width }) => (
                      <button
                        key={a.id}
                        onClick={e => { e.stopPropagation(); setModal({ open: true, mode: 'view', appointment: a }) }}
                        className="absolute rounded-xl overflow-hidden cursor-pointer transition-opacity hover:opacity-80 text-left px-3 py-2"
                        style={{
                          left: `calc(${left}% + 8px)`,
                          width: `calc(${width}% - 16px)`,
                          top: apptTopPx(a.scheduled_at, DAY_HOUR_HEIGHT),
                          height: apptHeightPx(a.duration_minutes, DAY_HOUR_HEIGHT),
                          background: STATUS_BG[a.status],
                          borderLeft: `3px solid ${STATUS_COLORS[a.status]}`,
                          color: STATUS_COLORS[a.status],
                          zIndex: 2,
                        }}
                      >
                        <div className="font-semibold text-sm leading-tight">
                          {fmtTime(a.scheduled_at)} – {fmtTime(a.end_at)}
                        </div>
                        <div
                          className="font-medium mt-0.5 truncate leading-tight"
                          style={{ fontSize: '12px', color: 'var(--text-primary)' }}
                        >
                          {a.client_name || '(sin cliente)'} · {a.barber_name}
                        </div>
                        {a.duration_minutes >= 30 && (
                          <div
                            className="truncate opacity-70 leading-tight"
                            style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                          >
                            {a.service_name}
                          </div>
                        )}
                        {a.duration_minutes >= 45 && (
                          <span
                            className="inline-block mt-1 px-1.5 py-0.5 rounded-full"
                            style={{
                              background: STATUS_COLORS[a.status] + '33',
                              color: STATUS_COLORS[a.status],
                              fontSize: '10px',
                            }}
                          >
                            {STATUS_LABELS[a.status]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Legend />
        </>
      )}

      {/* ════════════════════════════════════════
          AGENDA VIEW
      ════════════════════════════════════════ */}
      {view === 'agenda' && (
        <div className="space-y-3">
          {agendaDays.length === 0 && (
            <div
              className="rounded-2xl p-12 text-center"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}
            >
              <CalendarDays
                size={40}
                className="mx-auto mb-3"
                style={{ color: 'var(--text-muted)', opacity: 0.3 }}
              />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Sin citas en los próximos 14 días
              </p>
            </div>
          )}
          {agendaDays.map(day => {
            const key = isoDate(day)
            const dayAppts = (byDate[key] || []).slice().sort(
              (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
            )
            return (
              <div key={key} className="flex gap-4">
                {/* Date label */}
                <div className="w-14 flex-shrink-0 pt-1 text-right">
                  <div className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                    {format(day, 'EEE', { locale: es })}
                  </div>
                  <div
                    className="w-8 h-8 ml-auto mt-0.5 flex items-center justify-center rounded-full text-sm font-bold"
                    style={isToday(day)
                      ? { background: 'var(--gold-400)', color: '#000' }
                      : { color: 'var(--text-secondary)' }
                    }
                  >
                    {format(day, 'd')}
                  </div>
                </div>

                {/* Appointments */}
                <div className="flex-1 space-y-2">
                  {dayAppts.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setModal({ open: true, mode: 'view', appointment: a })}
                      className="w-full text-left rounded-xl px-4 py-3 cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        background: STATUS_BG[a.status],
                        borderLeft: `3px solid ${STATUS_COLORS[a.status]}`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-bold" style={{ color: STATUS_COLORS[a.status] }}>
                            {fmtTime(a.scheduled_at)}
                          </span>
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {a.client_name || '(sin cliente)'}
                          </span>
                          <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
                            · {a.service_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {a.barber_name} · {a.duration_minutes}min
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              background: STATUS_COLORS[a.status] + '33',
                              color: STATUS_COLORS[a.status],
                              fontSize: '10px',
                            }}
                          >
                            {STATUS_LABELS[a.status]}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CitaModal
        open={modal.open}
        onClose={() => setModal(CLOSED)}
        mode={modal.mode}
        appointment={modal.appointment}
        defaultDate={modal.defaultDate}
        onSaved={load}
        onReschedule={handleReschedule}
      />
    </div>
  )
}
