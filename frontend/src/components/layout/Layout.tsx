import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

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

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const title = Object.entries(TITLES).find(([path]) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  )?.[1] || 'Hair Craft'

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  return (
    <div className="flex h-screen" style={{ background: 'var(--surface-0)' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-64 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
