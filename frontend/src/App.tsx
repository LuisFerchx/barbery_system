import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewSale from './pages/NewSale'
import SalesHistory from './pages/SalesHistory'
import Clients from './pages/Clients'
import Inventory from './pages/Inventory'
import Analytics from './pages/Analytics'
import Expenses from './pages/Expenses'
import Settings from './pages/Settings'
import OperatingManual from './pages/OperatingManual'
import Services from './pages/Services'
import Admin from './pages/Admin'
import ProductSales from './pages/ProductSales'
import Companies from './pages/Companies'
import CompanySettings from './pages/CompanySettings'
import CajaChica from './pages/CajaChica'
import CitasList from './pages/CitasList'
import CitasCalendar from './pages/CitasCalendar'
import PublicBooking from './pages/PublicBooking'
import AppointmentLookup from './pages/AppointmentLookup'

/**
 * Guards a route by requiring an authenticated user and renders its children when allowed.
 *
 * If authentication state is loading, displays a full-screen loading message. If no user is authenticated, redirects to `/login`.
 *
 * @returns The `children` elements when a user is authenticated; otherwise a redirect to `/login` or a loading indicator.
 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function IndexRedirect() {
  const { user } = useAuth()
  if (user?.role === 'superadmin') return <Navigate to="/companies" replace />
  return <Dashboard />
}

function SuperadminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'superadmin') return <Navigate to="/" replace />
  return <>{children}</>
}

/**
 * Defines the application's client-side route hierarchy, including protected and role-restricted routes.
 *
 * @returns The React element tree containing the configured <Routes> and their route guards.
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/agendar/:slug" element={<PublicBooking />} />
      <Route path="/mi-cita/:code" element={<AppointmentLookup />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<IndexRedirect />} />
        <Route path="sales/new" element={<NewSale />} />
        <Route path="sales" element={<SalesHistory />} />
        <Route path="clients" element={<Clients />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="settings" element={<Settings />} />
        <Route path="services" element={<Services />} />
        <Route path="manual" element={<OperatingManual />} />
        <Route path="admin" element={<Admin />} />
        <Route path="product-sales" element={<ProductSales />} />
        <Route path="company-settings" element={<CompanySettings />} />
        <Route path="caja-chica" element={<CajaChica />} />
        <Route path="citas" element={<CitasList />} />
        <Route path="citas/calendario" element={<CitasCalendar />} />
        <Route path="companies" element={<SuperadminRoute><Companies /></SuperadminRoute>} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        basename="/barberia"
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </BrowserRouter>
    </AuthProvider>
  )
}
