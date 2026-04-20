import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
}

// Sales
export const salesApi = {
  list: (params?: Record<string, unknown>) => api.get('/sales', { params }),
  get: (id: number) => api.get(`/sales/${id}`),
  create: (data: unknown) => api.post('/sales', data),
  update: (id: number, data: unknown) => api.put(`/sales/${id}`, data),
  delete: (id: number) => api.delete(`/sales/${id}`),
  dailySummary: (date?: string) => api.get('/sales/daily-summary', { params: date ? { target_date: date } : {} }),
}

// Barbers
export const barbersApi = {
  list: () => api.get('/barbers'),
  get: (id: number) => api.get(`/barbers/${id}`),
  create: (data: unknown) => api.post('/barbers', data),
  update: (id: number, data: unknown) => api.put(`/barbers/${id}`, data),
  dashboard: (id: number, params?: Record<string, unknown>) => api.get(`/barbers/${id}/dashboard`, { params }),
  createAdvance: (data: unknown) => api.post('/barbers/advances/', data),
  listAdvances: (barberId?: number) => api.get('/barbers/advances/list', { params: barberId ? { barber_id: barberId } : {} }),
  createTransfer: (data: unknown) => api.post('/barbers/transfers/', data),
  listTransfers: (barberId?: number) => api.get('/barbers/transfers/list', { params: barberId ? { barber_id: barberId } : {} }),
}

// Catalog
export const catalogApi = {
  services: () => api.get('/catalog/services'),
  createService: (data: unknown) => api.post('/catalog/services', data),
  updateService: (id: number, data: unknown) => api.put(`/catalog/services/${id}`, data),
  deleteService: (id: number) => api.delete(`/catalog/services/${id}`),
  products: () => api.get('/catalog/products'),
  createProduct: (data: unknown) => api.post('/catalog/products', data),
  updateProduct: (id: number, data: unknown) => api.put(`/catalog/products/${id}`, data),
  deleteProduct: (id: number) => api.delete(`/catalog/products/${id}`),
}

// Inventory
export const inventoryApi = {
  list: (category?: string) => api.get('/inventory', { params: category ? { category } : {} }),
  lowStock: () => api.get('/inventory/low-stock'),
  create: (data: unknown) => api.post('/inventory', data),
  update: (id: number, data: unknown) => api.put(`/inventory/${id}`, data),
  addMovement: (id: number, data: unknown) => api.post(`/inventory/${id}/movement`, data),
  movements: (id: number) => api.get(`/inventory/${id}/movements`),
}

// Accounting
export const accountingApi = {
  dashboard: (params?: Record<string, unknown>) => api.get('/accounting/dashboard', { params }),
  expenses: (params?: Record<string, unknown>) => api.get('/accounting/expenses', { params }),
  createExpense: (data: unknown) => api.post('/accounting/expenses', data),
  updateExpense: (id: number, data: unknown) => api.put(`/accounting/expenses/${id}`, data),
  deleteExpense: (id: number) => api.delete(`/accounting/expenses/${id}`),
}

// Debts
export const debtsApi = {
  list: (params?: Record<string, unknown>) => api.get('/debts', { params }),
  get: (id: number) => api.get(`/debts/${id}`),
  create: (data: unknown) => api.post('/debts', data),
  update: (id: number, data: unknown) => api.put(`/debts/${id}`, data),
  payment: (id: number, data: unknown) => api.post(`/debts/${id}/payment`, data),
}

// Users
export const usersApi = {
  list: () => api.get('/users'),
  create: (data: unknown) => api.post('/users', data),
  update: (id: number, data: unknown) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
}
