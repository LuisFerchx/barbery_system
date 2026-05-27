export const COUNTRIES = [
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

export function splitPhone(combined: string): { dialCode: string; phone: string } {
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of sorted) {
    if (combined.startsWith(c.dial)) {
      return { dialCode: c.dial, phone: combined.slice(c.dial.length) }
    }
  }
  return { dialCode: '+57', phone: combined }
}

interface PhoneInputProps {
  dialCode: string
  phone: string
  onDialCodeChange: (v: string) => void
  onPhoneChange: (v: string) => void
  error?: string
  label?: string
  required?: boolean
}

export default function PhoneInput({
  dialCode,
  phone,
  onDialCodeChange,
  onPhoneChange,
  error,
  label = 'Teléfono',
  required,
}: PhoneInputProps) {
  const selectedCountry = COUNTRIES.find(c => c.dial === dialCode) ?? COUNTRIES[0]

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
        {label}{required ? ' *' : ''}
      </label>
      <div
        className="flex items-stretch overflow-hidden"
        style={{
          borderRadius: 10,
          border: `1px solid ${error ? '#ef4444' : 'var(--surface-border)'}`,
          background: 'var(--surface-2)',
        }}
      >
        <select
          value={dialCode}
          onChange={e => onDialCodeChange(e.target.value)}
          aria-label="Código de país"
          style={{
            background: '#1a1a1a',
            color: '#f0ede8',
            border: 'none',
            outline: 'none',
            padding: '10px 6px 10px 12px',
            fontSize: '14px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {COUNTRIES.map(c => (
            <option key={`${c.code}-${c.dial}`} value={c.dial} style={{ background: '#1a1a1a', color: '#f0ede8' }}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>

        <div style={{ width: 1, background: 'var(--surface-border)', margin: '8px 0', flexShrink: 0 }} />

        <input
          type="tel"
          placeholder={`${selectedCountry.flag} Número`}
          value={phone}
          onChange={e => onPhoneChange(e.target.value)}
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
      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  )
}
