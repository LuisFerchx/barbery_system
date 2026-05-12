import { useState, useEffect } from 'react'
import { manualApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Pencil, Save, X } from 'lucide-react'
import type { ManualEntry } from '../types'
import toast from 'react-hot-toast'

const SECTION_LABELS: Record<string, string> = {
  courtesy_protocol: 'Protocolo de Bebida de Cortesía',
  cross_sell_script: 'Script de Venta Cruzada',
  checkout_procedure: 'Procedimiento de Cobro',
  other: 'Otros',
}

export default function OperatingManual() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [entries, setEntries] = useState<ManualEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    manualApi.list()
      .then(r => setEntries(r.data))
      .catch(() => toast.error('Error al cargar manual'))
      .finally(() => setLoading(false))
  }, [])

  const startEdit = (e: ManualEntry) => {
    setEditing(e.id)
    setEditContent(e.content || '')
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditContent('')
  }

  const handleSave = async (entry: ManualEntry) => {
    setSaving(true)
    try {
      await manualApi.update(entry.id, { content: editContent })
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, content: editContent } : e))
      setEditing(null)
      toast.success('Guardado')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent"
          style={{ borderTopColor: 'var(--gold-500)', borderRightColor: 'rgba(200,134,14,0.3)' }} />
      </div>
    )
  }

  const grouped = entries.reduce<Record<string, ManualEntry[]>>((acc, e) => {
    if (!acc[e.section]) acc[e.section] = []
    acc[e.section].push(e)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Manual Operativo</h1>

      {Object.entries(grouped).map(([section, sectionEntries]) => (
        <div key={section} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {SECTION_LABELS[section] || section}
          </h2>
          {sectionEntries.sort((a, b) => a.order_index - b.order_index).map(entry => (
            <div key={entry.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {entry.title}
                </h3>
                {isAdmin && editing !== entry.id && (
                  <button onClick={() => startEdit(entry)} className="btn-icon flex-shrink-0" title="Editar">
                    <Pencil size={14} />
                  </button>
                )}
              </div>

              {editing === entry.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={6}
                    className="input w-full resize-none text-sm"
                    placeholder="Contenido del procedimiento..."
                  />
                  <div className="flex gap-2">
                    <button onClick={cancelEdit} className="btn-icon">
                      <X size={14} />
                    </button>
                    <button
                      onClick={() => handleSave(entry)}
                      disabled={saving}
                      className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5"
                    >
                      <Save size={12} />
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  {entry.content ? (
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                      {entry.content}
                    </p>
                  ) : (
                    <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                      {isAdmin ? 'Haz clic en editar para agregar contenido.' : 'Contenido pendiente.'}
                    </p>
                  )}
                  {entry.updated_by && (
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                      Actualizado por {entry.updated_by}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {entries.length === 0 && (
        <div className="flex items-center justify-center h-48">
          <p style={{ color: 'var(--text-muted)' }}>Sin entradas en el manual</p>
        </div>
      )}
    </div>
  )
}
