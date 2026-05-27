import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Building2, Clock, Calendar, Settings2 } from 'lucide-react'
import { companiesApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import PhoneInput, { splitPhone } from '../components/ui/PhoneInput'
import type { Company } from '../types'
import toast from 'react-hot-toast'

const DAYS = [
  { code: 'mon', label: 'Lun' },
  { code: 'tue', label: 'Mar' },
  { code: 'wed', label: 'Mié' },
  { code: 'thu', label: 'Jue' },
  { code: 'fri', label: 'Vie' },
  { code: 'sat', label: 'Sáb' },
  { code: 'sun', label: 'Dom' },
]

interface Form {
  name: string
  dialCode: string
  phone: string
  address: string
  open_hour: string
  close_hour: string
  commission_by_service: boolean
}

const EMPTY: Form = {
  name: '',
  dialCode: '+57',
  phone: '',
  address: '',
  open_hour: '',
  close_hour: '',
  commission_by_service: false,
}

function fromCompany(c: Company): { form: Form; days: Set<string> } {
  const { dialCode, phone } = splitPhone(c.phone ?? '')
  return {
    form: {
      name: c.name,
      dialCode,
      phone,
      address: c.address ?? '',
      open_hour: c.open_hour ?? '',
      close_hour: c.close_hour ?? '',
      commission_by_service: c.commission_by_service,
    },
    days: new Set(c.operating_days?.split(',').filter(Boolean) ?? []),
  }
}

export default function CompanySettings() {
  const { user } = useAuth()
  const [form, setForm] = useState<Form>(EMPTY)
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  if (user?.role !== 'admin') return <Navigate to="/" replace />

  useEffect(() => {
    companiesApi.getMe()
      .then(r => {
        const company = r.data as Company
        const { form: f, days } = fromCompany(company)
        setForm(f)
        setSelectedDays(days)
        setLogoUrl(company.logo_url ?? null)
        setLogoPreview(company.logo_url ?? null)
      })
      .catch(() => toast.error('Error al cargar datos de la empresa'))
      .finally(() => setLoading(false))
  }, [])

  const toggleDay = (code: string) =>
    setSelectedDays(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      await companiesApi.updateMe({
        name: form.name.trim(),
        phone: form.phone ? (form.dialCode + form.phone) : null,
        address: form.address || null,
        open_hour: form.open_hour || null,
        close_hour: form.close_hour || null,
        operating_days: selectedDays.size > 0 ? [...selectedDays].join(',') : null,
        commission_by_service: form.commission_by_service,
      })
      toast.success('Empresa actualizada')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleUploadLogo = async () => {
    if (!logoFile) return
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append('file', logoFile)
      const r = await companiesApi.uploadLogo(fd)
      const newUrl = (r.data as Company).logo_url ?? null
      setLogoUrl(newUrl)
      setLogoPreview(newUrl)
      setLogoFile(null)
      toast.success('Logo actualizado')
    } catch { toast.error('Error al subir logo') }
    finally { setUploadingLogo(false) }
  }

  const f = (k: keyof Pick<Form, 'name' | 'address' | 'open_hour' | 'close_hour'>) => ({
    value: form[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value })),
  })

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card animate-pulse" style={{ height: 120 }} />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,134,14,0.15)' }}>
          <Building2 size={18} style={{ color: 'var(--gold-400)' }} />
        </div>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Mi Empresa</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Configura el perfil y horario del establecimiento</p>
        </div>
      </div>

      {/* Logo */}
      <div className="card space-y-4">
        <p className="text-xs font-semibold flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Building2 size={13} />LOGO DE LA EMPRESA
        </p>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <img src={logoPreview} alt="logo" className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
              style={{ background: 'rgba(200,134,14,0.15)', color: 'var(--gold-400)' }}>
              {form.name.charAt(0) || '?'}
            </div>
          )}
          <div className="flex gap-2">
            <label className="btn-secondary text-xs cursor-pointer px-4 py-2">
              Elegir imagen
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
            {logoFile && (
              <button onClick={handleUploadLogo} disabled={uploadingLogo} className="btn-primary text-xs px-4">
                {uploadingLogo ? 'Subiendo...' : 'Subir logo'}
              </button>
            )}
          </div>
        </div>
        {logoUrl && !logoFile && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Logo actual guardado en Supabase.</p>
        )}
      </div>

      {/* Información general */}
      <div className="card space-y-4">
        <p className="text-xs font-semibold flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Settings2 size={13} />INFORMACIÓN GENERAL
        </p>
        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre *</label>
          <input className="input w-full" placeholder="Barbería El Corte" {...f('name')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <PhoneInput
            dialCode={form.dialCode}
            phone={form.phone}
            onDialCodeChange={v => setForm(prev => ({ ...prev, dialCode: v }))}
            onPhoneChange={v => setForm(prev => ({ ...prev, phone: v }))}
          />
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Dirección</label>
            <input className="input w-full" placeholder="Calle Principal 123" {...f('address')} />
          </div>
        </div>
      </div>

      {/* Horario */}
      <div className="card space-y-4">
        <p className="text-xs font-semibold flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Clock size={13} />HORARIO DE FUNCIONAMIENTO
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Hora apertura</label>
            <input type="time" className="input w-full" {...f('open_hour')} />
          </div>
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Hora cierre</label>
            <input type="time" className="input w-full" {...f('close_hour')} />
          </div>
        </div>
        <div>
          <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>
            <Calendar size={12} className="inline mr-1" />Días de operación
          </label>
          <div className="flex gap-2">
            {DAYS.map(({ code, label }) => {
              const active = selectedDays.has(code)
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleDay(code)}
                  className="flex-1 py-2 text-xs font-medium rounded-lg transition-all"
                  style={{
                    background: active ? 'rgba(200,134,14,0.2)' : 'var(--surface-2)',
                    color: active ? 'var(--gold-400)' : 'var(--text-muted)',
                    border: `1px solid ${active ? 'rgba(200,134,14,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Configuración */}
      <div className="card space-y-3">
        <p className="text-xs font-semibold flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Settings2 size={13} />CONFIGURACIÓN
        </p>
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="commission_by_service"
            checked={form.commission_by_service}
            onChange={e => setForm(prev => ({ ...prev, commission_by_service: e.target.checked }))}
            className="w-4 h-4 mt-0.5 cursor-pointer"
          />
          <label htmlFor="commission_by_service" className="cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <span className="text-sm font-medium block">Comisión por servicio</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Usa la comisión definida en cada servicio en lugar de la del barbero
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
