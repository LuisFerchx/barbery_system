import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { DollarSign, User, Scissors, Package, Coffee, CreditCard, ArrowLeft } from 'lucide-react'
import { salesApi, barbersApi, catalogApi, clientsApi, inventoryApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmt } from '../utils/format'
import type { Barber, ServiceCatalog, Client, InventoryItem } from '../types'
import toast from 'react-hot-toast'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card_debit', label: 'Tarjeta Débito' },
  { value: 'card_credit', label: 'Tarjeta Crédito' },
  { value: 'transfer', label: 'Transferencia' },
]

interface FormData {
  barber_id: string
  client_id: string
  client_search: string
  is_returning_client: boolean
  service_id: string
  gross_total: string
  payment_method: string
  courtesy_drink_given: boolean
  courtesy_drink_item_id: string
  cross_sell: boolean
  notes: string
  date: string
}

function FinancialPreview({ grossTotal, barberCommissionRate, splitConfig }: {
  grossTotal: number
  barberCommissionRate: number
  splitConfig: { name: string; percentage: number }[]
}) {
  if (!grossTotal || grossTotal <= 0) return null

  const barberCommission = grossTotal * barberCommissionRate
  const realIncome = grossTotal - barberCommission

  const split = Object.fromEntries(splitConfig.map(s => [s.name, s.percentage]))
  const profit = realIncome * (split.profit ?? 0.40)
  const ownerSalary = realIncome * (split.owner_salary ?? 0.30)
  const taxes = realIncome * (split.taxes ?? 0.20)
  const operating = realIncome * (split.operating ?? 0.10)

  return (
    <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>DESGLOSE FINANCIERO</p>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--text-muted)' }}>Total bruto</span>
          <span style={{ color: 'var(--text-primary)' }}>{fmt.money(grossTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--text-muted)' }}>Comisión barbero ({(barberCommissionRate * 100).toFixed(0)}%)</span>
          <span style={{ color: '#f87171' }}>-{fmt.money(barberCommission)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: 'var(--gold-400)' }}>Ingreso Real</span>
          <span style={{ color: 'var(--gold-400)' }}>{fmt.money(realIncome)}</span>
        </div>
        <div className="pt-1 space-y-1">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Split del ingreso real:</p>
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--text-muted)' }}>Ganancia ({(split.profit ?? 0.40) * 100}%)</span>
            <span style={{ color: '#4ade80' }}>{fmt.money(profit)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--text-muted)' }}>Sueldo socios ({(split.owner_salary ?? 0.30) * 100}%)</span>
            <span style={{ color: '#60a5fa' }}>{fmt.money(ownerSalary)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--text-muted)' }}>Impuestos ({(split.taxes ?? 0.20) * 100}%)</span>
            <span style={{ color: '#f87171' }}>{fmt.money(taxes)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--text-muted)' }}>Gastos operación ({(split.operating ?? 0.10) * 100}%)</span>
            <span style={{ color: '#c084fc' }}>{fmt.money(operating)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewSale() {
  const navigate = useNavigate()
  const { splitConfig } = useAuth()
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [services, setServices] = useState<ServiceCatalog[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [courtesyDrinks, setCourtesyDrinks] = useState<InventoryItem[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [showClientList, setShowClientList] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      is_returning_client: false,
      courtesy_drink_given: false,
      courtesy_drink_item_id: '',
      cross_sell: false,
    },
  })

  useEffect(() => {
    Promise.all([
      barbersApi.list({ active_only: true }),
      catalogApi.services({ active_only: true }),
      clientsApi.list({ active_only: true }),
      inventoryApi.list('courtesy'),
    ]).then(([b, s, c, drinks]) => {
      setBarbers(b.data)
      setServices(s.data)
      setClients(c.data)
      setCourtesyDrinks(drinks.data.filter((d: InventoryItem) => d.is_active))
    })
  }, [])

  const watchedBarberId = watch('barber_id')
  const watchedGrossTotal = watch('gross_total')
  const watchedCourtesyDrink = watch('courtesy_drink_given')

  useEffect(() => {
    if (!watchedCourtesyDrink) setValue('courtesy_drink_item_id', '')
  }, [watchedCourtesyDrink, setValue])

  const selectedBarber = useMemo(
    () => barbers.find(b => b.id === parseInt(watchedBarberId)),
    [barbers, watchedBarberId]
  )

  const filteredClients = useMemo(
    () => clientSearch.length >= 2
      ? clients.filter(c =>
        `${c.name} ${c.lastname}`.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone?.includes(clientSearch) ||
        c.identification_number?.includes(clientSearch)
      ).slice(0, 8)
      : [],
    [clients, clientSearch]
  )

  const onSubmit = async (data: FormData) => {
    if (!data.barber_id) { toast.error('Selecciona un barbero'); return }
    if (!data.service_id) { toast.error('Selecciona un servicio'); return }
    if (!data.gross_total || parseFloat(data.gross_total) <= 0) { toast.error('Ingresa el total'); return }
    if (data.courtesy_drink_given && !data.courtesy_drink_item_id) {
      toast.error('Selecciona la bebida de cortesía')
      return
    }

    setSaving(true)
    try {
      await salesApi.create({
        date: new Date(data.date + 'T12:00:00').toISOString(),
        client_id: data.client_id ? parseInt(data.client_id) : null,
        barber_id: parseInt(data.barber_id),
        service_id: parseInt(data.service_id),
        gross_total: parseFloat(data.gross_total),
        payment_method: data.payment_method,
        is_returning_client: data.is_returning_client,
        courtesy_drink_given: data.courtesy_drink_given,
        courtesy_drink_item_id: data.courtesy_drink_given && data.courtesy_drink_item_id
          ? parseInt(data.courtesy_drink_item_id) : null,
        cross_sell: data.cross_sell,
        notes: data.notes || null,
      })
      toast.success('Venta registrada')
      navigate('/sales')
    } catch {
      toast.error('Error al registrar la venta')
    } finally {
      setSaving(false)
    }
  }

  const labelClass = "block text-xs font-medium mb-1.5"
  const inputClass = "input w-full"

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/sales')} className="btn-icon">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Nuevo Corte</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Date */}
        <div className="card">
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Fecha</label>
          <input type="date" {...register('date')} className={inputClass} />
        </div>

        {/* Barber */}
        <div className="card">
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
            <Scissors size={12} className="inline mr-1" />Barbero
          </label>
          <select {...register('barber_id')} className={inputClass}>
            <option value="">Seleccionar barbero...</option>
            {barbers.map(b => (
              <option key={b.id} value={b.id}>{b.name} {b.lastname}</option>
            ))}
          </select>
        </div>

        {/* Client */}
        <div className="card">
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
            <User size={12} className="inline mr-1" />Cliente
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar cliente (nombre, teléfono)..."
              className={inputClass}
              value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setShowClientList(true) }}
              onFocus={() => setShowClientList(true)}
              onBlur={() => setTimeout(() => setShowClientList(false), 200)}
            />
            {showClientList && filteredClients.length > 0 && (
              <div className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                {filteredClients.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={() => {
                      setValue('client_id', String(c.id))
                      setClientSearch(`${c.name} ${c.lastname}`)
                      setShowClientList(false)
                    }}
                  >
                    <span className="font-medium">{c.name} {c.lastname}</span>
                    {c.phone && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{c.phone}</span>}
                    {c.identification_number && <span className="ml-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>ID: {c.identification_number}</span>}
                  </button>
                ))}
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--gold-400)' }}
                  onClick={() => { setValue('client_id', ''); setClientSearch(''); setShowClientList(false) }}
                >
                  Sin cliente registrado
                </button>
              </div>
            )}
          </div>
          <input type="hidden" {...register('client_id')} />

          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input type="checkbox" {...register('is_returning_client')} className="rounded" />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Cliente recurrente</span>
          </label>
        </div>

        {/* Service */}
        <div className="card">
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
            <Scissors size={12} className="inline mr-1" />Servicio
          </label>
          <select {...register('service_id')} className={inputClass}>
            <option value="">Seleccionar servicio...</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name} — {fmt.money(Number(s.price))}</option>
            ))}
          </select>
        </div>

        {/* Toggles */}
        <div className="card space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('courtesy_drink_given')} className="rounded" />
            <span className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <Coffee size={14} style={{ color: 'var(--gold-400)' }} />
              Se ofreció bebida de cortesía
            </span>
          </label>
          {watchedCourtesyDrink && (
            <div className="ml-7">
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>
                Bebida seleccionada *
              </label>
              <select {...register('courtesy_drink_item_id')} className="input w-full">
                <option value="">Seleccionar bebida...</option>
                {courtesyDrinks.map(d => (
                  <option key={d.id} value={d.id} disabled={d.stock_current <= 0}>
                    {d.name} — stock: {d.stock_current} {d.unit}
                    {d.stock_current <= 0 ? ' (sin stock)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('cross_sell')} className="rounded" />
            <span className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <Package size={14} style={{ color: 'var(--gold-400)' }} />
              Venta cruzada (compró producto)
            </span>
          </label>
        </div>

        {/* Payment */}
        <div className="card">
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
            <CreditCard size={12} className="inline mr-1" />Pago
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Total cobrado al cliente</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="input w-full pl-7"
                  {...register('gross_total')}
                />
              </div>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Método de pago</label>
              <select {...register('payment_method')} className={inputClass}>
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedBarber && (
            <FinancialPreview
              grossTotal={parseFloat(watchedGrossTotal) || 0}
              barberCommissionRate={Number(selectedBarber.commission_rate)}
              splitConfig={splitConfig}
            />
          )}
        </div>

        {/* Notes */}
        <div className="card">
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Notas</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Observaciones opcionales..."
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/sales')} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <DollarSign size={16} />
            {saving ? 'Registrando...' : 'Registrar Venta'}
          </button>
        </div>
      </form>
    </div>
  )
}
