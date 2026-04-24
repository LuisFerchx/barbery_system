import { Menu, Bell, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLocation } from 'react-router-dom'

const TITLES: Record<string, string> = {
  '/':            'Dashboard',
  '/sales':       'Ventas',
  '/barbers':     'Barberos',
  '/catalog':     'Servicios y Productos',
  '/inventory':   'Inventario',
  '/accounting':  'Contabilidad',
  '/transfers':   'Transferencias',
  '/debts':       'Deudas',
  '/admin':       'Administración',
}

interface Props {
  onMenuClick: () => void
  title: string
}

export default function Header({ onMenuClick, title }: Props) {
  const { user } = useAuth()
  const location = useLocation()

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
        {/* Membership badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{
            background: 'rgba(200,134,14,0.1)',
            border: '1px solid rgba(200,134,14,0.2)',
          }}>
          <Sparkles size={12} style={{ color: 'var(--gold-400)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--gold-400)' }}>Premium</span>
        </div>

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
