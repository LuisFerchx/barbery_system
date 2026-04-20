import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Users, Package, Archive,
  Calculator, ArrowLeftRight, CreditCard, Settings, Scissors, X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sales', icon: ShoppingCart, label: 'Ventas' },
  { to: '/barbers', icon: Users, label: 'Barberos' },
  { to: '/catalog', icon: Package, label: 'Servicios/Productos' },
  { to: '/inventory', icon: Archive, label: 'Inventario' },
  { to: '/accounting', icon: Calculator, label: 'Contabilidad' },
  { to: '/transfers', icon: ArrowLeftRight, label: 'Transferencias' },
  { to: '/debts', icon: CreditCard, label: 'Deudas' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { user } = useAuth()

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />
      )}
      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-30 flex flex-col transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Scissors className="text-brand-400" size={22} />
            <span className="font-bold text-lg tracking-wide">Hair Craft</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Settings size={18} />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-400">{user?.full_name || user?.username}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>
      </aside>
    </>
  )
}
