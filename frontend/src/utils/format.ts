/**
 * Format the current local date as YYYY-MM-DD.
 *
 * @returns The local date formatted as `YYYY-MM-DD`.
 */
export function localDayStr(date: Date = new Date()): string {
  const yyyy = String(date.getFullYear())
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export const fmt = {
  money: (n: number) => `$${n.toFixed(2)}`,
  date: (d: string) => new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('es-EC'),
  datetime: (d: string) => new Date(d).toLocaleString('es-EC'),
  percent: (n: number) => `${n.toFixed(1)}%`,
}

export const EXPENSE_CATEGORIES = [
  'Toallas', 'Bebidas', 'Internet', 'Luz', 'Agua',
  'Arrendamiento', 'Suministros', 'Publicidad', 'Mantenimiento', 'Otros',
]

export const BANKS = ['Pichincha', 'Austro', 'Jardín Azuayo', 'JEP', 'Guayaquil', 'Otro']

export const DRINKS = ['NADA', 'COLA', 'AGUA', 'POWER', 'FUZETEA', 'CERVEZA', 'ENERGIZANTE']

export const PAYMENT_METHODS = ['efectivo', 'transferencia', 'tarjeta']
