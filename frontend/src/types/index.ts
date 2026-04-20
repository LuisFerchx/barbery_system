export interface User {
  id: number
  username: string
  email?: string
  full_name?: string
  role: 'admin' | 'manager' | 'barber'
  is_active: boolean
  created_at: string
}

export interface Barber {
  id: number
  name: string
  lastname?: string
  phone?: string
  email?: string
  commission_rate: number
  is_active: boolean
  created_at: string
}

export interface BarberDashboard {
  barber: Barber
  total_clients: number
  total_sales: number
  total_commissions: number
  total_advances: number
  net_balance: number
  total_bank_transfers: number
}

export interface Service {
  id: number
  name: string
  price: number
  commission: number
  description?: string
  is_active: boolean
  created_at: string
}

export interface Product {
  id: number
  name: string
  price: number
  commission: number
  description?: string
  is_active: boolean
  created_at: string
}

export interface Sale {
  id: number
  date: string
  client_name: string
  client_lastname?: string
  contact: string
  barber_id: number
  barber_name?: string
  service_id?: number
  service_name?: string
  service_value: number
  product_id?: number
  product_name?: string
  product_value: number
  drink: string
  total: number
  tip: number
  bank_transfer: number
  barber_commission: number
  status: string
  notes?: string
  created_at: string
}

export interface PaginatedSales {
  items: Sale[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface InventoryItem {
  id: number
  name: string
  category?: string
  unit: string
  stock_initial: number
  stock_current: number
  stock_opened: number
  stock_sold: number
  low_stock_alert: number
  cost_price: number
  sale_price: number
  is_active: number
  created_at: string
}

export interface InventoryMovement {
  id: number
  item_id: number
  movement_type: string
  quantity: number
  reason?: string
  date: string
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

export interface AccountingDashboard {
  service_income: number
  product_income: number
  transfer_income: number
  cash_income: number
  total_income: number
  total_expenses: number
  net_profit: number
  period_label: string
}

export interface Debt {
  id: number
  client_name: string
  client_lastname?: string
  client_phone?: string
  concept: string
  original_amount: number
  paid_amount: number
  pending_amount: number
  date: string
  due_date?: string
  status: 'pendiente' | 'parcial' | 'pagado'
  notes?: string
  created_at: string
}

export interface Advance {
  id: number
  barber_id: number
  amount: number
  date: string
  note?: string
}

export interface BankTransfer {
  id: number
  barber_id?: number
  recipient_name: string
  amount: number
  bank: string
  reference?: string
  note?: string
  date: string
}

export interface TokenOut {
  access_token: string
  refresh_token: string
  token_type: string
}
