'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { supabase } from '@/lib/supabase'
import { OrderStatus } from '@/lib/types'
import {
  Search, Download, Eye, Package, MapPin, FileText, X, Printer,
} from 'lucide-react'
import { printOrderLabel } from '@/components/PrintLabel'
import Link from 'next/link'

type OrderRow = {
  id: string
  tracking_number: string
  customer_name: string
  customer_phone: string
  customer_city: string
  customer_address: string
  items: any[]
  total_amount: number
  status: string
  payment_method: string
  notes?: string | null
  cancel_reason?: string | null
  created_at: string
  seller_id?: string | null
}

const statusFilters: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'pending',   label: 'Pending'   },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped',   label: 'Shipped'   },
  { value: 'delivered', label: 'Delivered' },
  { value: 'returned',  label: 'Returned'  },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')

  useEffect(() => {
    supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setOrders((data || []) as OrderRow[])
      setLoading(false)
    })
  }, [])

  const filtered = orders.filter((order) => {
    const q = search.toLowerCase()
    const matchesSearch =
      order.tracking_number?.toLowerCase().includes(q) ||
      order.customer_name?.toLowerCase().includes(q) ||
      (order.customer_phone || '').includes(search) ||
      (order.customer_city || '').toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen">
      <Header
        title="Orders"
        subtitle={`${orders.length} total orders`}
        action={{ label: 'New Order', href: '/dashboard/orders/new' }}
      />

      <div className="px-6 pt-5 pb-6 space-y-4">
        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] shadow-sm transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === f.value
                    ? 'bg-[#1a1c3a] text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-all shadow-sm flex-shrink-0">
            <Download size={13} />
            Export
          </button>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3.5">Tracking</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5 hidden md:table-cell">Items</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5 hidden lg:table-cell">City</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5">Amount</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5 hidden xl:table-cell">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400">
                      <Package size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No orders found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => {
                    const items = Array.isArray(order.items) ? order.items : []
                    return (
                      <tr
                        key={order.id}
                        className="table-row-hover cursor-pointer"
                        onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="text-xs font-mono font-semibold text-[#1a1c3a]">{order.tracking_number}</div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium mt-1 inline-block ${
                            order.payment_method === 'COD'
                              ? 'bg-orange-50 text-orange-600'
                              : 'bg-blue-50 text-blue-600'
                          }`}>
                            {order.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-xs font-bold text-[#1a1c3a] flex-shrink-0">
                              {(order.customer_name || '?')[0]}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-[#1a1c3a]">{order.customer_name}</div>
                              <div className="text-xs text-gray-400">{order.customer_phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <div className="max-w-[160px]">
                            {items.slice(0, 1).map((p, i) => (
                              <div key={i} className="text-xs text-gray-600 truncate">{p.name || 'Item'}</div>
                            ))}
                            {items.length > 1 && (
                              <div className="text-xs text-gray-400">+{items.length - 1} more</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin size={12} className="text-gray-400" />
                            {order.customer_city}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs font-bold text-[#1a1c3a]">
                            KES {(order.total_amount || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={order.status as any} />
                          {order.status === 'cancelled' && order.cancel_reason && (
                            <div className="mt-1 text-[10px] text-red-500 max-w-[160px] truncate" title={order.cancel_reason}>
                              {order.cancel_reason}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 hidden xl:table-cell">
                          <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-[#f4991a]/10 flex items-center justify-center text-gray-400 hover:text-[#f4991a] transition-all"
                              title="View details"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => printOrderLabel({
                                tracking: order.tracking_number,
                                customerName: order.customer_name,
                                customerPhone: order.customer_phone,
                                customerAddress: order.customer_address || '',
                                customerCity: order.customer_city,
                                items: Array.isArray(order.items) ? order.items : [],
                                totalAmount: order.total_amount,
                                paymentMethod: order.payment_method,
                              })}
                              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-indigo-50 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all"
                              title="Print label"
                            >
                              <Printer size={13} />
                            </button>
                            <Link
                              href={`/dashboard/invoices?order=${order.id}`}
                              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all"
                              title="View invoice"
                            >
                              <FileText size={13} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
            <span className="text-xs text-gray-400">
              Showing {filtered.length} of {orders.length} orders
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
