import { useState } from 'react'

export interface ClientFormData {
  name: string
  lastname: string
  phone: string
  email: string
  notes: string
}

interface Props {
  value: ClientFormData
  onChange: (data: ClientFormData) => void
  onNext: () => void
  onBack: () => void
}

export default function StepClientInfo({ value, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({})

  function validate(): boolean {
    const e: typeof errors = {}
    if (!value.name.trim()) e.name = 'Requerido'
    if (!value.lastname.trim()) e.lastname = 'Requerido'
    if (!value.phone.trim() || value.phone.trim().length < 7) e.phone = 'Mínimo 7 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function set(field: keyof ClientFormData, val: string) {
    onChange({ ...value, [field]: val })
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

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
          <input
            type="tel"
            placeholder="3001234567"
            value={value.phone}
            onChange={(e) => set('phone', e.target.value)}
            style={inputStyle(!!errors.phone)}
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
    borderRadius: '10px',
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
