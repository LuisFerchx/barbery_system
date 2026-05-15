import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/barberia/api/v1'

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

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
}

export const salesApi = {
  list: (params?: Record<string, unknown>) => api.get('/sales/', { params }),
  get: (id: number) => api.get(`/sales/${id}`),
  create: (data: unknown) => api.post('/sales/', data),
  delete: (id: number) => api.delete(`/sales/${id}`),
}

export const productSalesApi = {
  list: (params?: Record<string, unknown>) => api.get('/product-sales/', { params }),
  get: (id: number) => api.get(`/product-sales/${id}`),
  create: (data: unknown) => api.post('/product-sales/', data),
  delete: (id: number) => api.delete(`/product-sales/${id}`),
}

export const barbersApi = {
  list: (params?: Record<string, unknown>) => api.get('/barbers/', { params }),
  get: (id: number) => api.get(`/barbers/${id}`),
  create: (data: unknown) => api.post('/barbers/', data),
  update: (id: number, data: unknown) => api.put(`/barbers/${id}`, data),
}

export const clientsApi = {
  list: (params?: Record<string, unknown>) => api.get('/clients/', { params }),
  get: (id: number) => api.get(`/clients/${id}`),
  create: (data: unknown) => api.post('/clients/', data),
  update: (id: number, data: unknown) => api.put(`/clients/${id}`, data),
  delete: (id: number) => api.delete(`/clients/${id}`),
}

export const catalogApi = {
  services: (params?: Record<string, unknown>) => api.get('/catalog/services', { params }),
  createService: (data: unknown) => api.post('/catalog/services', data),
  updateService: (id: number, data: unknown) => api.put(`/catalog/services/${id}`, data),
  deleteService: (id: number) => api.delete(`/catalog/services/${id}`),
  products: (params?: Record<string, unknown>) => api.get('/catalog/products', { params }),
  createProduct: (data: unknown) => api.post('/catalog/products', data),
  updateProduct: (id: number, data: unknown) => api.put(`/catalog/products/${id}`, data),
  deleteProduct: (id: number) => api.delete(`/catalog/products/${id}`),
}

export const inventoryApi = {
  list: (category?: string) => api.get('/inventory/', { params: category ? { category } : {} }),
  lowStock: () => api.get('/inventory/low-stock'),
  create: (data: unknown) => api.post('/inventory/', data),
  update: (id: number, data: unknown) => api.put(`/inventory/${id}`, data),
  addMovement: (id: number, data: unknown) => api.post(`/inventory/${id}/movement`, data),
  movements: (id: number) => api.get(`/inventory/${id}/movements`),
}

export const expensesApi = {
  list: (params?: Record<string, unknown>) => api.get('/expenses/', { params }),
  create: (data: unknown) => api.post('/expenses/', data),
  update: (id: number, data: unknown) => api.put(`/expenses/${id}`, data),
  delete: (id: number) => api.delete(`/expenses/${id}`),
}

export const analyticsApi = {
  clients: (month?: string) => api.get('/analytics/clients', { params: month ? { month } : {} }),
  crossSell: (month?: string) => api.get('/analytics/cross-sell', { params: month ? { month } : {} }),
  courtesyDrinks: (month?: string) => api.get('/analytics/courtesy-drinks', { params: month ? { month } : {} }),
}

export const dashboardApi = {
  summary: (month?: string) => api.get('/dashboard/summary', { params: month ? { month } : {} }),
}

export const configApi = {
  getSplit: () => api.get('/config/split'),
  updateSplit: (data: unknown) => api.put('/config/split', data),
  getPaymentMethods: () => api.get('/config/payment-methods'),
  updatePaymentMethod: (method: string, data: unknown) => api.put(`/config/payment-methods/${method}`, data),
}

export const manualApi = {
  list: (section?: string) => api.get('/manual/entries', { params: section ? { section } : {} }),
  create: (data: unknown) => api.post('/manual/entries', data),
  update: (id: number, data: unknown) => api.put(`/manual/entries/${id}`, data),
  delete: (id: number) => api.delete(`/manual/entries/${id}`),
}

export const usersApi = {
  list: () => api.get('/users/'),
  create: (data: unknown) => api.post('/users/', data),
  update: (id: number, data: unknown) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
}

export const companiesApi = {
  list: () => api.get('/companies/'),
  get: (id: number) => api.get(`/companies/${id}`),
  create: (data: unknown) => api.post('/companies/', data),
  setup: (data: unknown) => api.post('/companies/setup/', data),
  update: (id: number, data: unknown) => api.put(`/companies/${id}`, data),
  createUser: (companyId: number, data: unknown) => api.post(`/companies/${companyId}/users/`, data),
}
