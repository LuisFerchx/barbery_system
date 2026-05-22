import { useState } from 'react'

export interface ClientFormData {
  name: string
  lastname: string
  dialCode: string
  phone: string
  identification_number: string
  email: string
  notes: string
}

interface Props {
  value: ClientFormData
  onChange: (data: ClientFormData) => void
  onNext: () => void
  onBack: () => void
}

const COUNTRIES = [
  { code: 'CO', dial: '+57',  flag: '🇨🇴', name: 'Colombia' },
  { code: 'MX', dial: '+52',  flag: '🇲🇽', name: 'México' },
  { code: 'EC', dial: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: 'PE', dial: '+51',  flag: '🇵🇪', name: 'Perú' },
  { code: 'VE', dial: '+58',  flag: '🇻🇪', name: 'Venezuela' },
  { code: 'AR', dial: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: 'CL', dial: '+56',  flag: '🇨🇱', name: 'Chile' },
  { code: 'BO', dial: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: 'PA', dial: '+507', flag: '🇵🇦', name: 'Panamá' },
  { code: 'CR', dial: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: 'GT', dial: '+502', flag: '🇬🇹', name: 'Guatemala' },
  { code: 'HN', dial: '+504', flag: '🇭🇳', name: 'Honduras' },
  { code: 'SV', dial: '+503', flag: '🇸🇻', name: 'El Salvador' },
  { code: 'NI', dial: '+505', flag: '🇳🇮', name: 'Nicaragua' },
  { code: 'DO', dial: '+1',   flag: '🇩🇴', name: 'R. Dominicana' },
  { code: 'CU', dial: '+53',  flag: '🇨🇺', name: 'Cuba' },
  { code: 'PY', dial: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: 'UY', dial: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'USA' },
  { code: 'CA', dial: '+1',   flag: '🇨🇦', name: 'Canadá' },
  { code: 'ES', dial: '+34',  flag: '🇪🇸', name: 'España' },
  { code: 'BR', dial: '+55',  flag: '🇧🇷', name: 'Brasil' },
]

export default function StepClientInfo({ value, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({})

  function validate(): boolean {
    const e: typeof errors = {}
    if (!value.name.trim()) e.name = 'Requerido'
    if (!value.lastname.trim()) e.lastname = 'Requerido'
    if (!value.phone.trim() || value.phone.trim().length < 7) e.phone = 'Mínimo 7 dígitos'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function set(field: keyof ClientFormData, val: string) {
    onChange({ ...value, [field]: val })
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const selectedCountry = COUNTRIES.find(c => c.dial === value.dialCode) ?? COUNTRIES[0]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Tus datos
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Para confirmar y registrar tu cita
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre *" error={errors.name}>
            <input
              type="text"
              placeholder="Juan"
              value={value.name}
              onChange={(e) => set('name', e.target.value)}
              style={inputStyle(!!errors.name)}
            />
          </Field>
          <Field label="Apellido *" error={errors.lastname}>
            <input
              type="text"
              placeholder="Pérez"
              value={value.lastname}
              onChange={(e) => set('lastname', e.target.value)}
              style={inputStyle(!!errors.lastname)}
            />
          </Field>
        </div>

        <Field label="Teléfono *" error={errors.phone}>
          <div
            className="flex items-stretch overflow-hidden"
            style={{
              borderRadius: 10,
              border: `1px solid ${errors.phone ? '#ef4444' : 'var(--surface-border)'}`,
              background: 'var(--surface-2)',
            }}
          >
            <select
              value={value.dialCode}
              onChange={(e) => set('dialCode', e.target.value)}
              aria-label="Código de país"
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                outline: 'none',
                padding: '10px 6px 10px 12px',
                fontSize: '14px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {COUNTRIES.map(c => (
                <option key={`${c.code}-${c.dial}`} value={c.dial}>
                  {c.flag} {c.dial}
                </option>
              ))}
            </select>

            <div style={{ width: 1, background: 'var(--surface-border)', margin: '8px 0', flexShrink: 0 }} />

            <input
              type="tel"
              placeholder={`${selectedCountry.flag} Número`}
              value={value.phone}
              onChange={(e) => set('phone', e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
          </div>
        </Field>

        <Field label="Número de identificación (opcional)">
          <input
            type="text"
            placeholder="Cédula, pasaporte, etc."
            value={value.identification_number}
            onChange={(e) => set('identification_number', e.target.value)}
            style={inputStyle(false)}
          />
        </Field>

        <Field label="Email (opcional)">
          <input
            type="email"
            placeholder="juan@email.com"
            value={value.email}
            onChange={(e) => set('email', e.target.value)}
            style={inputStyle(false)}
          />
        </Field>

        <Field label="Notas (opcional)">
          <textarea
            placeholder="Ej: cabello largo, alergias, preferencias..."
            value={value.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            style={{ ...inputStyle(false), resize: 'none' }}
          />
        </Field>
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
          onClick={() => validate() && onNext()}
          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ background: 'var(--gold-400)', color: '#000' }}
        >
          Confirmar →
        </button>
      </div>
    </div>
  )
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    background: 'var(--surface-2)',
    border: `1px solid ${hasError ? '#ef4444' : 'var(--surface-border)'}`,
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
  }
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  )
}
