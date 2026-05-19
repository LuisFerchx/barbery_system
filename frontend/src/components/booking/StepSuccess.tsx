import { Link } from 'react-router-dom'
import type { BookingResult } from '../../services/publicApi'

interface Props {
  booking: BookingResult
  onRestart: () => void
}

function fmtDT(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

export default function StepSuccess({ booking, onRestart }: Props) {
  function copyCode() {
    if (booking.code) navigator.clipboard.writeText(booking.code)
  }

  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
        style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)' }}
      >
        ✓
      </div>

      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          ¡Cita agendada!
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Guarda tu código para consultar el estado
        </p>
      </div>

      {booking.code && (
        <button
          onClick={copyCode}
          className="flex flex-col items-center gap-1 px-8 py-4 rounded-2xl transition-all hover:opacity-80"
          style={{ background: 'rgba(228,162,37,0.12)', border: '2px dashed var(--gold-400)' }}
          title="Copiar código"
        >
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Código de cita
          </span>
          <span className="text-3xl font-bold tracking-widest" style={{ color: 'var(--gold-400)' }}>
            {booking.code}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Toca para copiar</span>
        </button>
      )}

      <div
        className="w-full rounded-xl p-4 flex flex-col gap-3 text-left"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}
      >
        <Row label="Barbero" value={booking.barber_name} />
        <Row label="Servicio" value={booking.service_name} />
        <Row label="Fecha" value={fmtDT(booking.scheduled_at)} />
        <Row label="Horario" value={`${fmtTime(booking.scheduled_at)} – ${fmtTime(booking.end_at)}`} />
        {booking.client_name && <Row label="Cliente" value={booking.client_name} />}
      </div>

      <div className="flex flex-col gap-3 w-full">
        {booking.code && (
          <Link
            to={`/mi-cita/${booking.code}`}
            className="w-full py-3 rounded-xl font-semibold text-sm text-center transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold-400)', color: '#000', display: 'block' }}
          >
            Ver mi cita
          </Link>
        )}
        <button
          onClick={onRestart}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}
        >
          Agendar otra cita
        </button>
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
