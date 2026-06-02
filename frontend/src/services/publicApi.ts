import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/barberia/api/v1'

const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export interface ShopInfo {
  name: string
  slug: string
  phone?: string | null
  address?: string | null
  open_hour?: string | null
  close_hour?: string | null
  operating_days?: string | null
  logo_url?: string | null
  is_active: boolean
}

export interface ServiceTypePublic {
  id: number
  name: string
}

export interface BarberPublic {
  id: number
  name: string
  lastname: string
  photo_url?: string | null
  service_types: ServiceTypePublic[]
}

export interface ServicePublic {
  id: number
  name: string
  category: string
  service_type_id?: number | null
  price: number
  duration?: number | null
}

export interface SlotPublic {
  time: string
  datetime: string
}

export interface BookingPayload {
  barber_id: number
  service_id: number
  scheduled_at: string
  client_phone: string
  client_name: string
  client_lastname: string
  client_email?: string
  client_identification_number?: string
  notes?: string
}

export interface BookingResult {
  id: number
  code: string | null
  barber_name: string
  service_name: string
  scheduled_at: string
  end_at: string
  duration_minutes: number
  status: string
  client_name: string | null
}

export interface AppointmentPublic {
  id: number
  code: string | null
  shop_name: string
  shop_slug: string
  barber_name: string
  service_name: string
  scheduled_at: string
  end_at: string
  duration_minutes: number
  status: string
  client_name: string | null
  notes: string | null
}

export const bookingApi = {
  getShop: (slug: string) =>
    publicApi.get<ShopInfo>(`/public/${slug}`),
  getBarbers: (slug: string) =>
    publicApi.get<BarberPublic[]>(`/public/${slug}/barbers`),
  getServices: (slug: string) =>
    publicApi.get<ServicePublic[]>(`/public/${slug}/services`),
  getSlots: (slug: string, params: { barber_id: number; date: string; service_id: number }) =>
    publicApi.get<SlotPublic[]>(`/public/${slug}/slots`, { params }),
  book: (slug: string, data: BookingPayload) =>
    publicApi.post<BookingResult>(`/public/${slug}/book`, data),
  getByCode: (code: string) =>
    publicApi.get<AppointmentPublic>(`/public/appointment/${code}`),
}
