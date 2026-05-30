export interface Company {
  id: number
  name: string
  slug: string
  phone?: string
  address?: string
  is_active: boolean
  commission_by_service: boolean
  open_hour?: string | null
  close_hour?: string | null
  operating_days?: string | null
  logo_url?: string | null
  created_at: string
}

export interface User {
  id: number
  username: string
  email?: string
  full_name?: string
  role: 'superadmin' | 'admin' | 'manager' | 'barber'
  is_active: boolean
  company_id?: number
  company_name?: string
  company_slug?: string
  commission_by_service?: boolean
  created_at: string
}

export interface Barber {
  id: number
  name: string
  lastname: string
  phone?: string
  photo_url?: string | null
  commission_rate: number
  is_active: boolean
  created_at: string
}

export interface Client {
  id: number
  name: string
  lastname: string
  phone?: string
  identification_number?: string
  email?: string
  notes?: string
  is_active: boolean
  created_at: string
  total_sales?: number
}

export interface ServiceCatalog {
  id: number
  name: string
  category: 'haircut' | 'beard' | 'combo' | 'other'
  price: number
  commission_rate?: number | null
  duration?: number | null
  is_active: boolean
}

export interface ProductCatalog {
  id: number
  name: string
  brand?: string
  cost_price: number
  sale_price: number
  is_active: boolean
}

export interface Sale {
  id: number
  number: string
  date: string
  client_id?: number
  client_name?: string
  barber_id: number
  barber_name?: string
  service_id: number
  service_name?: string
  gross_total: number
  payment_method: 'cash' | 'card_debit' | 'card_credit' | 'transfer'
  is_returning_client: boolean
  barber_commission_amount: number
  real_income: number
  split_profit: number
  split_owner_salary: number
  split_taxes: number
  split_operating: number
  courtesy_drink_given: boolean
  courtesy_drink_item_id?: number | null
  courtesy_drink_item_name?: string | null
  cross_sell: boolean
  notes?: string
  created_at: string
}

export interface SaleListOut {
  items: Sale[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface ProductSale {
  id: number
  date: string
  barber_id: number
  barber_name?: string
  item_id: number
  item_name?: string
  client_id?: number
  client_name?: string
  quantity: number
  unit_price: number
  subtotal: number
  barber_commission_amount: number
  payment_method: string
  notes?: string
  created_at: string
}

export interface ProductSaleListOut {
  items: ProductSale[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface InventoryItem {
  id: number
  name: string
  category: 'merchandise' | 'courtesy'
  unit: string
  stock_current: number
  stock_minimum: number
  cost_per_unit: number
  is_active: boolean
  created_at: string
}

export interface InventoryMovement {
  id: number
  item_id: number
  movement_type: 'in' | 'out' | 'adjustment'
  quantity: number
  reason?: string
  date: string
  product_sale_id?: number
}

export interface Expense {
  id: number
  date: string
  category: string
  description?: string
  amount: number
  payment_method: string
  created_at: string
}

export interface SplitConfig {
  id: number
  name: string
  percentage: number
  updated_at: string
}

export interface PaymentMethodConfig {
  id: number
  method: string
  commission_rate: number
  updated_at: string
}

export interface InventoryAlert {
  item_id: number
  name: string
  category: string
  stock_current: number
  stock_minimum: number
}

export interface TopBarber {
  barber_id: number
  name: string
  lastname: string
  total_real_income: number
  total_sales: number
}

export interface SplitBreakdown {
  profit: number
  owner_salary: number
  taxes: number
  operating: number
}

export interface DashboardSummary {
  month: string
  gross_income: number
  service_gross_income: number
  product_gross_income: number
  barber_commissions_total: number
  real_income_total: number
  total_expenses: number
  operating_profit: number
  taxes_reserved: number
  net_profit: number
  cash_register_adjustments: number
  cash_closings_count: number
  split_breakdown: SplitBreakdown
  inventory_alerts: InventoryAlert[]
  top_barbers: TopBarber[]
}

export interface CashSummary {
  period_from: string
  period_to: string
  sales_cash: number
  product_sales_cash: number
  expenses_cash: number
  expected_cash: number
}

export interface CashRegisterClosing {
  id: number
  closed_at: string
  period_from: string
  period_to: string
  sales_cash: number
  product_sales_cash: number
  expenses_cash: number
  expected_cash: number
  actual_cash: number
  discrepancy: number
  notes?: string
  closed_by_user_id: number
}

export interface ClientMetrics {
  month: string
  new_clients: number
  returning_clients: number
  total_clients: number
  retention_rate: number
}

export interface BarberCrossSell {
  barber_id: number
  name: string
  lastname: string
  total_services: number
  product_sales_count: number
  cross_sell_rate: number
}

export interface CrossSellMetrics {
  month: string
  total_services: number
  cross_sell_count: number
  overall_rate: number
  by_barber: BarberCrossSell[]
}

export interface CourtesyDrinkRank {
  item_id: number
  name: string
  count: number
}

export interface CourtesyDrinksMetrics {
  month: string
  top_drinks: CourtesyDrinkRank[]
}

export interface ManualEntry {
  id: number
  section: string
  title: string
  content?: string
  order_index: number
  updated_at: string
  updated_by?: string
}

export interface TokenOut {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface Appointment {
  id: number
  company_id: number
  client_id?: number | null
  client_name?: string | null
  barber_id: number
  barber_name: string
  service_id: number
  service_name: string
  duration_minutes: number
  scheduled_at: string
  end_at: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  notes?: string | null
  code?: string | null
  created_at: string
  updated_at?: string | null
}

export interface AppointmentListOut {
  items: Appointment[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface BarberHours {
  id: number
  company_id: number
  barber_id: number
  name: string
  start_time: string
  end_time: string
  start_date: string
  end_date: string
  is_recurring: boolean
  day_of_week?: string | null
  exceptions?: string | null
}

