import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Menu, Bell, QrCode, Copy, Check, X } from 'lucide-react'
import QRCode from 'react-qr-code'
import { useAuth } from '../../context/AuthContext'
import { useLocation } from 'react-router-dom'

const TITLES: Record<string, string> = {
  '/':                    'Dashboard',
  '/sales':               'Ventas',
  '/barbers':             'Barberos',
  '/catalog':             'Servicios y Productos',
  '/inventory':           'Inventario',
  '/accounting':          'Contabilidad',
  '/transfers':           'Transferencias',
  '/debts':               'Deudas',
  '/admin':               'Administración',
  '/citas/calendario':    'Calendario de Citas',
  '/citas':               'Citas del Día',
}

interface Props {
  onMenuClick: () => void
  title: string
}

export default function Header({ onMenuClick, title }: Props) {
  const { user } = useAuth()
  const location = useLocation()
  const [showQr, setShowQr] = useState(false)

  const pageTitle = Object.entries(TITLES).find(([path]) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  )?.[1] || title

  return (
    <header
      className="h-14 flex items-center justify-between px-5 sticky top-0 z-10"
      style={{
        background: 'rgba(8,8,8,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          id="sidebar-toggle"
          onClick={onMenuClick}
          className="lg:hidden btn-icon"
        >
          <Menu size={16} />
        </button>
        <h1 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          {pageTitle}
        </h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Booking QR button */}
        {user?.company_slug && (
          <>
            <button
              onClick={() => setShowQr(true)}
              aria-label="Ver QR de reservas"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-opacity duration-150 hover:opacity-75"
              style={{
                background: 'rgba(200,134,14,0.1)',
                border: '1px solid rgba(200,134,14,0.2)',
              }}
            >
              <QrCode size={13} style={{ color: 'var(--gold-400)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--gold-400)' }}>Reservas</span>
            </button>
            {showQr && (
              <BookingQrModal
                slug={user.company_slug}
                onClose={() => setShowQr(false)}
              />
            )}
          </>
        )}

        {/* Notifications */}
        <button className="btn-icon relative">
          <Bell size={15} />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--gold-400)' }}
          />
        </button>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #C8860E, #E4A225)',
            color: '#000',
          }}
          title={user?.full_name || user?.username}
        >
          {(user?.full_name || user?.username || '?')[0].toUpperCase()}
        </div>
      </div>
    </header>
  )
}

function BookingQrModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/barberia/agendar/${slug}`

  function copyUrl() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-5 rounded-2xl p-6 w-full"
        style={{
          maxWidth: 320,
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer transition-opacity hover:opacity-70"
          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>

        <div>
          <p className="text-sm font-semibold text-center mb-0.5" style={{ color: 'var(--text-primary)' }}>
            QR de reservas
          </p>
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            Comparte con tus clientes para agendar
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white shadow-inner">
          <QRCode value={url} size={180} />
        </div>

        <div
          className="w-full rounded-lg px-3 py-2 text-center"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-border)' }}
        >
          <p className="text-xs font-mono break-all" style={{ color: 'var(--text-muted)' }}>
            {url}
          </p>
        </div>

        <button
          onClick={copyUrl}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-85"
          style={{
            background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(200,134,14,0.15)',
            color: copied ? '#4ade80' : 'var(--gold-400)',
            border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'rgba(200,134,14,0.3)'}`,
            transition: 'background 0.2s, color 0.2s, border-color 0.2s',
          }}
        >
          {copied
            ? <><Check size={15} /> Copiado!</>
            : <><Copy size={15} /> Copiar enlace</>
          }
        </button>
      </div>
    </div>,
    document.body
  )
}
