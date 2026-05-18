import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { bookingApi } from '../services/publicApi'
import type { AppointmentPublic } from '../services/publicApi'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pendiente',   color: 'var(--gold-400)',       bg: 'rgba(228,162,37,0.12)' },
  confirmed: { label: 'Confirmada',  color: '#60a5fa',               bg: 'rgba(96,165,250,0.12)' },
  completed: { label: 'Completada',  color: '#34d399',               bg: 'rgba(52,211,153,0.12)' },
  cancelled: { label: 'Cancelada',   color: '#f87171',               bg: 'rgba(248,113,113,0.12)' },
  no_show:   { label: 'No asistió',  color: 'var(--text-muted)',     bg: 'var(--surface-2)'       },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

export default function AppointmentLookup() {
  const { code } = useParams<{ code: string }>()
  const [appt, setAppt] = useState<AppointmentPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return
    bookingApi
      .getByCode(code)
      .then((r) => setAppt(r.data))
      .catch(() => setError('Cita no encontrada. Verifica el código.'))
      .finally(() => setLoading(false))
  }, [code])

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4" style={{ background: 'var(--surface-0)' }}>
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Mi cita
          </h1>
          {code && (
            <span
              className="text-sm font-bold tracking-widest px-3 py-1 rounded-lg"
              style={{ background: 'rgba(228,162,37,0.12)', color: 'var(--gold-400)' }}
            >
              {code.toUpperCase()}
            </span>
          )}
        </div>

        {loading && (
          <div
            className="rounded-2xl p-6 animate-pulse"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 rounded mb-3" style={{ background: 'var(--surface-2)', width: `${60 + i * 8}%` }} />
            ))}
          </div>
        )}

        {error && !loading && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}
          >
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
          </div>
        )}

        {appt && !loading && (
          <div
            className="rounded-2xl p-6 flex flex-col gap-5"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}
          >
            {/* Status badge */}
            {(() => {
              const s = STATUS_LABELS[appt.status] ?? STATUS_LABELS.pending
              return (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Estado
                  </span>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {s.label}
                  </span>
                </div>
              )
            })()}

            <div className="h-px" style={{ background: 'var(--surface-border)' }} />

            <div className="flex flex-col gap-4">
              <Row label="Barbería" value={appt.shop_name} />
              <Row label="Barbero" value={appt.barber_name} />
              <Row label="Servicio" value={`${appt.service_name} · ${appt.duration_minutes} min`} />
              <Row label="Fecha" value={fmtDate(appt.scheduled_at)} />
              <Row label="Horario" value={`${fmtTime(appt.scheduled_at)} – ${fmtTime(appt.end_at)}`} />
              {appt.client_name && <Row label="Cliente" value={appt.client_name} />}
              {appt.notes && <Row label="Notas" value={appt.notes} />}
            </div>
          </div>
        )}

        {appt && (
          <Link
            to={`/agendar/${appt.shop_slug}`}
            className="block w-full text-center py-3 mt-4 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}
          >
            Agendar otra cita
          </Link>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-sm text-right" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}
