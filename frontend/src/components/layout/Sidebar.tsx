import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Users, Package, Archive,
  Calculator, ArrowLeftRight, CreditCard, Settings, Scissors,
  X, LogOut
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sales',       icon: ShoppingCart,    label: 'Ventas' },
  { to: '/barbers',     icon: Users,           label: 'Barberos' },
  { to: '/catalog',     icon: Package,         label: 'Servicios' },
  { to: '/inventory',   icon: Archive,         label: 'Inventario' },
  { to: '/accounting',  icon: Calculator,      label: 'Contabilidad' },
  { to: '/transfers',   icon: ArrowLeftRight,  label: 'Transferencias' },
  { to: '/debts',       icon: CreditCard,      label: 'Deudas' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { user, logout } = useAuth()

  return (
    <>
      {/* Mobile backdrop */}
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
            <div className="flex items-center justify-center w-9 h-9 rounded-xl gold-glow"
              style={{ background: 'linear-gradient(135deg, #C8860E, #E4A225)' }}>
              <Scissors size={18} className="text-black" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide" style={{ color: 'var(--text-primary)' }}>
                Hair Craft
              </span>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden btn-icon"
          >
            <X size={16} />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 mb-4 divider border-t" />

        {/* Navigation */}
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

          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) => clsx('nav-item', isActive && 'active')}
            >
              <Settings size={16} />
              Admin
            </NavLink>
          )}
        </nav>

        {/* User footer */}
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
            <button
              onClick={logout}
              className="btn-icon"
              title="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
