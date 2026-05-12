import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi, configApi } from '../services/api'
import type { User, SplitConfig, PaymentMethodConfig } from '../types'

interface AuthCtx {
  user: User | null
  loading: boolean
  splitConfig: SplitConfig[]
  paymentConfig: PaymentMethodConfig[]
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshConfig: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [splitConfig, setSplitConfig] = useState<SplitConfig[]>([])
  const [paymentConfig, setPaymentConfig] = useState<PaymentMethodConfig[]>([])

  const loadConfig = async () => {
    try {
      const [splitRes, paymentRes] = await Promise.all([
        configApi.getSplit(),
        configApi.getPaymentMethods(),
      ])
      setSplitConfig(splitRes.data)
      setPaymentConfig(paymentRes.data)
    } catch {
      // config load failure is non-fatal
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      authApi.me()
        .then(r => {
          setUser(r.data)
          return loadConfig()
        })
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username: string, password: string) => {
    const { data } = await authApi.login(username, password)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    const me = await authApi.me()
    setUser(me.data)
    await loadConfig()
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
    setSplitConfig([])
    setPaymentConfig([])
  }

  const refreshConfig = loadConfig

  return (
    <AuthContext.Provider value={{ user, loading, splitConfig, paymentConfig, login, logout, refreshConfig }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
