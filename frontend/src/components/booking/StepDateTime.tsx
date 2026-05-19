import { useEffect, useState } from 'react'
import type { ServicePublic, SlotPublic } from '../../services/publicApi'
import { bookingApi } from '../../services/publicApi'

interface Props {
  slug: string
  barberId: number
  services: ServicePublic[]
  selectedServiceId: number | null
  selectedSlot: SlotPublic | null
  onSelectService: (id: number) => void
  onSelectSlot: (slot: SlotPublic) => void
  onNext: () => void
  onBack: () => void
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function StepDateTime({
  slug,
  barberId,
  services,
  selectedServiceId,
  selectedSlot,
  onSelectService,
  onSelectSlot,
  onNext,
  onBack,
}: Props) {
  const [date, setDate] = useState(todayStr())
  const [slots, setSlots] = useState<SlotPublic[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    if (!selectedServiceId || !date) return
    setLoadingSlots(true)
    setSlots([])
    bookingApi
      .getSlots(slug, { barber_id: barberId, date, service_id: selectedServiceId })
      .then((r) => setSlots(r.data))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [slug, barberId, selectedServiceId, date])

  const selectedService = services.find((s) => s.id === selectedServiceId)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Fecha y horario
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Elige el servicio, día y hora
        </p>
      </div>

      {/* Service selector */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
          Servicio
        </label>
        <div className="flex flex-col gap-2">
          {services.map((s) => {
            const sel = s.id === selectedServiceId
            return (
              <button
                key={s.id}
                onClick={() => onSelectService(s.id)}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all"
                style={{
                  background: sel ? 'rgba(228,162,37,0.12)' : 'var(--surface-2)',
                  border: sel ? '2px solid var(--gold-400)' : '1px solid var(--surface-border)',
                }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {s.name}
                </span>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>{s.duration ?? 30} min</span>
                  <span className="font-semibold" style={{ color: sel ? 'var(--gold-400)' : 'var(--text-secondary)' }}>
                    ${Number(s.price).toFixed(2)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Date picker */}
      {selectedServiceId && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
            Fecha
          </label>
          <input
            type="date"
            value={date}
            min={todayStr()}
            onChange={(e) => { setDate(e.target.value); onSelectSlot(null as unknown as SlotPublic) }}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-primary)',
              colorScheme: 'dark',
            }}
          />
        </div>
      )}

      {/* Slots */}
      {selectedServiceId && date && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
            Horario disponible {selectedService && `· ${selectedService.duration ?? 30} min`}
          </label>
          {loadingSlots ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--surface-2)' }} />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
              Sin horarios disponibles para esta fecha
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => {
                const sel = slot.datetime === selectedSlot?.datetime
                return (
                  <button
                    key={slot.datetime}
                    onClick={() => onSelectSlot(slot)}
                    className="py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: sel ? 'var(--gold-400)' : 'var(--surface-2)',
                      color: sel ? '#000' : 'var(--text-secondary)',
                      border: sel ? 'none' : '1px solid var(--surface-border)',
                    }}
                  >
                    {slot.time}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}
        >
          ← Atrás
        </button>
        <button
          onClick={onNext}
          disabled={!selectedServiceId || !selectedSlot}
          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--gold-400)', color: '#000' }}
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}
