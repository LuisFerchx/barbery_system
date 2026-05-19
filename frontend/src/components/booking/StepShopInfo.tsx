import type { ShopInfo } from '../../services/publicApi'

interface Props {
  shop: ShopInfo
  onNext: () => void
}

function dayLabel(operating_days: string | null | undefined): string {
  if (!operating_days) return ''
  const s = operating_days.trim()
  if (s.length === 7 && /^[01]+$/.test(s)) {
    const names = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    return names.filter((_, i) => s[i] === '1').join(', ')
  }
  return s
}

export default function StepShopInfo({ shop, onNext }: Props) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold"
        style={{ background: 'var(--gold-400)', color: '#000' }}
      >
        {shop.name.charAt(0).toUpperCase()}
      </div>

      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {shop.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Agenda tu cita en minutos
        </p>
      </div>

      <div
        className="w-full rounded-xl p-4 flex flex-col gap-3 text-left"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}
      >
        {shop.address && (
          <Row icon="📍" text={shop.address} />
        )}
        {shop.phone && (
          <Row icon="📞" text={shop.phone} />
        )}
        {shop.open_hour && shop.close_hour && (
          <Row icon="🕐" text={`${shop.open_hour} – ${shop.close_hour}`} />
        )}
        {shop.operating_days && (
          <Row icon="📅" text={dayLabel(shop.operating_days)} />
        )}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl font-semibold text-base transition-opacity hover:opacity-90"
        style={{ background: 'var(--gold-400)', color: '#000' }}
      >
        Agendar cita →
      </button>
    </div>
  )
}

function Row({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base mt-0.5">{icon}</span>
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</span>
    </div>
  )
}
