import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, Users, Package,
  BarChart2, Receipt, Settings, BookOpen, Shield, Scissors, X, LogOut, ShoppingBag, Building2, Wallet,
  CalendarDays, List, Calendar, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: BarChart2, label: 'Analítica' },
  { to: '/sales', icon: ClipboardList, label: 'Registro de Cortes' },
  { to: '/product-sales', icon: ShoppingBag, label: 'Venta de Productos' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/inventory', icon: Package, label: 'Inventario' },
  { to: '/expenses', icon: Receipt, label: 'Gastos' },
  { to: '/caja-chica', icon: Wallet, label: 'Caja Chica' },
  { to: '/services', icon: Scissors, label: 'Servicios' },
  { to: '/manual', icon: BookOpen, label: 'Manual' },
]

const CITAS_NAV = [
  { to: '/citas', icon: List, label: 'Lista del Día' },
  { to: '/citas/calendario', icon: Calendar, label: 'Calendario' },
]

const ADMIN_NAV = [
  { to: '/company-settings', icon: Building2, label: 'Mi Empresa' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
  { to: '/admin', icon: Shield, label: 'Administración' },
]

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Render a responsive, role-aware navigation sidebar with a collapsible "Citas" section.
 *
 * The sidebar shows primary navigation, an expandable "Citas" group whose open state
 * is persisted to `localStorage` (key: `citas-nav-open`), and role-specific links for
 * `admin` and `superadmin`. It also displays the current user's name/role and a logout action.
 *
 * @param open - Whether the sidebar is visible (affects mobile overlay and transform).
 * @param onClose - Callback invoked to close the sidebar (used by overlay, links, and mobile close button).
 * @returns The sidebar JSX element.
 */
export default function Sidebar({ open, onClose }: Props) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const isCitasActive = location.pathname.startsWith('/citas')

  const [citasOpen, setCitasOpen] = useState(() => {
    try {
      return localStorage.getItem('citas-nav-open') === 'true' || isCitasActive
    } catch {
      return isCitasActive
    }
  })

  const toggleCitas = () => {
    const next = !citasOpen
    setCitasOpen(next)
    try { localStorage.setItem('citas-nav-open', String(next)) } catch { /* ignore */ }
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}

      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 z-30 flex flex-col transition-transform duration-300 ease-out',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )} style={{
        background: 'linear-gradient(180deg, #0e0e0e 0%, #0a0a0a 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg shadow-lg overflow-hidden border" style={{ borderColor: '#C8860E' }}>
              <img src={`${import.meta.env.BASE_URL}light-open-logo.gif`} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide" style={{ color: 'var(--text-primary)' }}>
                BarberCraft System
              </span>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {user?.role === 'superadmin' ? 'Super Admin' : (user?.company_name || 'Management')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden btn-icon">
            <X size={16} />
          </button>
        </div>

        <div className="mx-5 mb-4 divider border-t" />

        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) => clsx('nav-item', isActive && 'active')}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          {/* Citas group */}
          <button
            onClick={toggleCitas}
            className={clsx(
              'nav-item w-full text-left',
              isCitasActive && 'text-amber-400'
            )}
            style={isCitasActive ? { color: 'var(--gold-400)' } : {}}
          >
            <CalendarDays size={16} />
            <span className="flex-1">Citas</span>
            <ChevronDown
              size={14}
              className="transition-transform duration-200"
              style={{ transform: citasOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {citasOpen && (
            <div className="pl-4 space-y-0.5">
              {CITAS_NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  onClick={onClose}
                  className={({ isActive }) => clsx('nav-item text-sm', isActive && 'active')}
                >
                  <Icon size={14} />
                  {label}
                </NavLink>
              ))}
            </div>
          )}

          {user?.role === 'admin' && (
            <>
              <div className="mx-2 my-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
              {ADMIN_NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) => clsx('nav-item', isActive && 'active')}
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </>
          )}

          {user?.role === 'superadmin' && (
            <>
              <div className="mx-2 my-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
              <NavLink
                to="/companies"
                onClick={onClose}
                className={({ isActive }) => clsx('nav-item', isActive && 'active')}
              >
                <Building2 size={16} />
                Empresas
              </NavLink>
            </>
          )}
        </nav>

        <div className="mx-5 mb-4 divider border-t mt-4" />
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'rgba(200,134,14,0.2)', color: 'var(--gold-400)', border: '1px solid rgba(200,134,14,0.3)' }}>
                {(user?.full_name || user?.username || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {user?.full_name || user?.username}
                </p>
                <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                  {user?.role}
                </p>
              </div>
            </div>
            <button onClick={logout} className="btn-icon" title="Cerrar sesión">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
