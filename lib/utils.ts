import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { OrderStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusConfig(status: OrderStatus | string) {
  const config: Record<string, { label: string; className: string; dot: string }> = {
    pending:          { label: 'Pending',        className: 'badge-pending',   dot: 'bg-yellow-500'  },
    confirmed:        { label: 'Confirmed',      className: 'badge-confirmed', dot: 'bg-blue-500'    },
    prepared:         { label: 'Prepared',       className: 'badge-confirmed', dot: 'bg-indigo-500'  },
    shipped_to_agent: { label: 'Sent to Agent',  className: 'badge-shipped',   dot: 'bg-purple-500'  },
    shipped:          { label: 'Shipped',        className: 'badge-shipped',   dot: 'bg-indigo-500'  },
    delivered:        { label: 'Delivered',      className: 'badge-delivered', dot: 'bg-emerald-500' },
    returned:         { label: 'Returned',       className: 'badge-returned',  dot: 'bg-red-500'     },
    cancelled:        { label: 'Cancelled',      className: 'badge-cancelled', dot: 'bg-gray-400'    },
  }
  return config[status as string] || { label: status || 'Unknown', className: 'badge-pending', dot: 'bg-gray-400' }
}

export function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
