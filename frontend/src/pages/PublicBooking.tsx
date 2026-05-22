import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { bookingApi } from '../services/publicApi'
import type { ShopInfo, BarberPublic, ServicePublic, SlotPublic, BookingResult } from '../services/publicApi'
import BookingStepper from '../components/booking/BookingStepper'
import StepShopInfo from '../components/booking/StepShopInfo'
import StepBarber from '../components/booking/StepBarber'
import StepDateTime from '../components/booking/StepDateTime'
import StepClientInfo from '../components/booking/StepClientInfo'
import type { ClientFormData } from '../components/booking/StepClientInfo'
import StepSuccess from '../components/booking/StepSuccess'

const STEP_LABELS = ['Barbería', 'Barbero', 'Fecha', 'Datos', 'Listo']

const EMPTY_CLIENT: ClientFormData = { name: '', lastname: '', dialCode: '+57', phone: '', identification_number: '', email: '', notes: '' }

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>()

  const [step, setStep] = useState(1)
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [barbers, setBarbers] = useState<BarberPublic[]>([])
  const [services, setServices] = useState<ServicePublic[]>([])

  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<SlotPublic | null>(null)
  const [clientData, setClientData] = useState<ClientFormData>(EMPTY_CLIENT)

  const [booking, setBooking] = useState<BookingResult | null>(null)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingShop, setLoadingShop] = useState(true)
  const [shopError, setShopError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoadingShop(true)
    Promise.all([
      bookingApi.getShop(slug),
      bookingApi.getBarbers(slug),
      bookingApi.getServices(slug),
    ])
      .then(([shopRes, barbersRes, servicesRes]) => {
        setShop(shopRes.data)
        setBarbers(barbersRes.data)
        setServices(servicesRes.data)
      })
      .catch(() => setShopError('No se pudo cargar la información de la barbería.'))
      .finally(() => setLoadingShop(false))
  }, [slug])

  async function handleConfirm() {
    if (!slug || !selectedBarberId || !selectedServiceId || !selectedSlot) return
    setSubmitting(true)
    setBookingError(null)
    try {
      const { data } = await bookingApi.book(slug, {
        barber_id: selectedBarberId,
        service_id: selectedServiceId,
        scheduled_at: selectedSlot.datetime,
        client_name: clientData.name,
        client_lastname: clientData.lastname,
        client_phone: `${clientData.dialCode}${clientData.phone}`,
        client_email: clientData.email || undefined,
        client_identification_number: clientData.identification_number || undefined,
        notes: clientData.notes || undefined,
      })
      setBooking(data)
      setStep(5)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Error al agendar la cita. Intenta de nuevo.'
      setBookingError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  function restart() {
    setStep(1)
    setSelectedBarberId(null)
    setSelectedServiceId(null)
    setSelectedSlot(null)
    setClientData(EMPTY_CLIENT)
    setBooking(null)
    setBookingError(null)
  }

  if (loadingShop) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-0)' }}>
        <div className="text-sm animate-pulse" style={{ color: 'var(--text-muted)' }}>Cargando…</div>
      </div>
    )
  }

  if (shopError || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-0)' }}>
        <p className="text-sm" style={{ color: '#ef4444' }}>{shopError || 'Barbería no encontrada.'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4" style={{ background: 'var(--surface-0)' }}>
      <div className="w-full max-w-md">
        {step < 5 && (
          <BookingStepper currentStep={step} totalSteps={5} labels={STEP_LABELS} />
        )}

        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}
        >
          {step === 1 && (
            <StepShopInfo shop={shop} onNext={() => setStep(2)} />
          )}

          {step === 2 && (
            <StepBarber
              barbers={barbers}
              selectedId={selectedBarberId}
              onSelect={setSelectedBarberId}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <StepDateTime
              slug={slug!}
              barberId={selectedBarberId!}
              services={services}
              selectedServiceId={selectedServiceId}
              selectedSlot={selectedSlot}
              onSelectService={(id) => { setSelectedServiceId(id); setSelectedSlot(null) }}
              onSelectSlot={setSelectedSlot}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <div className="flex flex-col gap-5">
              <StepClientInfo
                value={clientData}
                onChange={setClientData}
                onBack={() => setStep(3)}
                onNext={handleConfirm}
              />
              {submitting && (
                <p className="text-sm text-center animate-pulse" style={{ color: 'var(--text-muted)' }}>
                  Agendando tu cita…
                </p>
              )}
              {bookingError && (
                <p className="text-sm text-center" style={{ color: '#ef4444' }}>{bookingError}</p>
              )}
            </div>
          )}

          {step === 5 && booking && (
            <StepSuccess booking={booking} onRestart={restart} />
          )}
        </div>
      </div>
    </div>
  )
}
