import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'
import { configApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import type { SplitConfig, PaymentMethodConfig } from '../types'

const PAY_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card_debit: 'Tarjeta Débito',
  card_credit: 'Tarjeta Crédito',
  transfer: 'Transferencia',
}

const SPLIT_LABELS: Record<string, string> = {
  profit: 'Ganancia',
  owner_salary: 'Sueldo socios',
  taxes: 'Impuestos',
  operating: 'Gastos operación',
}

export default function Settings() {
  const { user, refreshConfig } = useAuth()
  const [splits, setSplits] = useState<SplitConfig[]>([])
  const [payments, setPayments] = useState<PaymentMethodConfig[]>([])
  const [splitValues, setSplitValues] = useState<Record<string, string>>({})
  const [payValues, setPayValues] = useState<Record<string, string>>({})
  const [savingSplit, setSavingSplit] = useState(false)
  const [savingPay, setSavingPay] = useState(false)

  useEffect(() => {
    Promise.all([configApi.getSplit(), configApi.getPaymentMethods()])
      .then(([s, p]) => {
        setSplits(s.data)
        setPayments(p.data)
        setSplitValues(Object.fromEntries(s.data.map((x: SplitConfig) => [x.name, String((x.percentage * 100).toFixed(1))])))
        setPayValues(Object.fromEntries(p.data.map((x: PaymentMethodConfig) => [x.method, String((x.commission_rate * 100).toFixed(1))])))
      })
  }, [])

  const handleSaveSplit = async () => {
    const total = Object.values(splitValues).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`Los porcentajes deben sumar 100% (actual: ${total.toFixed(1)}%)`)
      return
    }
    setSavingSplit(true)
    try {
      const payload = Object.fromEntries(
        splits.map(s => [s.name, (parseFloat(splitValues[s.name]) || 0) / 100])
      )
      await configApi.updateSplit(payload)
      await refreshConfig()
      toast.success('Split actualizado')
    } catch {
      toast.error('Error al guardar split')
    } finally {
      setSavingSplit(false)
    }
  }

  const handleSavePay = async (method: string) => {
    setSavingPay(true)
    try {
      await configApi.updatePaymentMethod(method, {
        commission_rate: (parseFloat(payValues[method]) || 0) / 100,
      })
      await refreshConfig()
      toast.success('Comisión actualizada')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSavingPay(false)
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-48">
        <p style={{ color: 'var(--text-muted)' }}>Acceso solo para administradores</p>
      </div>
    )
  }

  const splitSum = Object.values(splitValues).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
  const splitOk = Math.abs(splitSum - 100) < 0.01

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Configuración</h1>

      {/* Split config */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Split de Ingreso Real
          </h2>
          <span className="text-xs font-medium" style={{ color: splitOk ? '#4ade80' : '#f87171' }}>
            Total: {splitSum.toFixed(1)}%
          </span>
        </div>

        <div className="flex gap-2.5 rounded-xl px-3.5 py-3" style={{ background: 'rgba(200,134,14,0.08)', border: '1px solid rgba(200,134,14,0.18)' }}>
          <Info size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--gold-400)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            El <strong style={{ color: 'var(--text-primary)' }}>ingreso real</strong> es el total de cortes y ventas de productos menos la comisión del barbero.
            Estos porcentajes distribuyen ese ingreso entre categorías contables. Si coloca sueldo de socios tambien se quitara del ingreso real.{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Deben sumar exactamente 100%.</strong>
          </p>
        </div>

        <div className="space-y-3">
          {splits.map(s => (
            <div key={s.name} className="flex items-center gap-3">
              <label className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                {SPLIT_LABELS[s.name] || s.name}
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="input w-20 text-right"
                  value={splitValues[s.name] ?? ''}
                  onChange={e => setSplitValues(prev => ({ ...prev, [s.name]: e.target.value }))}
                />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>%</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveSplit}
          disabled={savingSplit || !splitOk}
          className="btn-primary w-full"
        >
          {savingSplit ? 'Guardando...' : 'Guardar Split'}
        </button>
      </div>

      {/* Payment method commissions */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          Comisiones por Método de Pago
        </h2>

        <div className="flex gap-2.5 rounded-xl px-3.5 py-3" style={{ background: 'rgba(200,134,14,0.08)', border: '1px solid rgba(200,134,14,0.18)' }}>
          <Info size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--gold-400)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Porcentaje que cobra el banco o plataforma según el método de cobro.
            Se descuenta del ingreso real al registrar una venta.{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Ejemplo: si la tarjeta cobra 3%, ingresa 3.0.</strong>{' '}
            Efectivo normalmente es 0%.
          </p>
        </div>

        <div className="space-y-3">
          {payments.map(p => (
            <div key={p.method} className="flex items-center gap-3">
              <label className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                {PAY_LABELS[p.method] || p.method}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="input w-20 text-right"
                    value={payValues[p.method] ?? ''}
                    onChange={e => setPayValues(prev => ({ ...prev, [p.method]: e.target.value }))}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>%</span>
                </div>
                <button
                  onClick={() => handleSavePay(p.method)}
                  disabled={savingPay}
                  className="btn-secondary text-xs px-3 py-1"
                >
                  Guardar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
