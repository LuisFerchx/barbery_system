import type { BarberPublic } from '../../services/publicApi'

interface Props {
  barbers: BarberPublic[]
  selectedId: number | null
  onSelect: (id: number) => void
  onNext: () => void
  onBack: () => void
}

export default function StepBarber({ barbers, selectedId, onSelect, onNext, onBack }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Elige tu barbero
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Selecciona quién te atenderá
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {barbers.map((b) => {
          const selected = b.id === selectedId
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              className="flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-200"
              style={{
                background: selected ? 'rgba(228,162,37,0.12)' : 'var(--surface-2)',
                border: selected ? '2px solid var(--gold-400)' : '1px solid var(--surface-border)',
              }}
            >
              {b.photo_url ? (
                <img
                  src={b.photo_url!}
                  alt={b.name}
                  className="w-14 h-14 rounded-full object-cover"
                  style={{ border: selected ? '2px solid var(--gold-400)' : 'none' }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{
                    background: selected ? 'var(--gold-400)' : 'var(--surface-3)',
                    color: selected ? '#000' : 'var(--text-secondary)',
                  }}
                >
                  {b.name.charAt(0)}{b.lastname.charAt(0)}
                </div>
              )}
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {b.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {b.lastname}
                </p>
              </div>
            </button>
          )
        })}
      </div>

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
          disabled={!selectedId}
          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--gold-400)', color: '#000' }}
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}
