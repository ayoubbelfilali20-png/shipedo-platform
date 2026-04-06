'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { mockOrders } from '@/lib/data'
import { formatDate } from '@/lib/utils'
import { OrderStatus } from '@/lib/types'
import {
  Search, Download, Eye, Package,
  MapPin, FileText, X, Phone, AlertTriangle,
} from 'lucide-react'
import { getExistingOrderFlags } from '@/lib/orderFlags'
import Link from 'next/link'

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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<typeof mockOrders[0] | null>(null)
  const filtered = mockOrders.filter((order) => {
    const matchesSearch =
      order.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      order.customerPhone.includes(search) ||
      order.customerCity.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen">
      <Header
        title="Orders"
        subtitle={`${mockOrders.length} total orders`}
        action={{ label: 'New Order', href: '/dashboard/orders/new' }}
      />

      <div className="px-6 pt-5 pb-6 space-y-4">

        {/* ── Search + Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search — standalone, compact */}
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] shadow-sm transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status pills */}
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

          {/* Export — pushed right */}
          <button className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-all shadow-sm flex-shrink-0">
            <Download size={13} />
            Export
          </button>
        </div>

        {/* ── Orders Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3.5">Tracking</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5 hidden md:table-cell">Products</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5 hidden lg:table-cell">City</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5">Amount</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5 hidden xl:table-cell">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400">
                      <Package size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No orders found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => (
                    <tr
                      key={order.id}
                      className="table-row-hover cursor-pointer"
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="text-xs font-mono font-semibold text-[#1a1c3a]">{order.trackingNumber}</div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium mt-1 inline-block ${
                          order.paymentMethod === 'COD'
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-xs font-bold text-[#1a1c3a] flex-shrink-0">
                            {order.customerName[0]}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[#1a1c3a]">{order.customerName}</div>
                            <div className="text-xs text-gray-400">{order.customerPhone}</div>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {getExistingOrderFlags(order.id).map(flag => (
                                <span key={flag.type} className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${flag.color} ${flag.bg} ${flag.border}`}>
                                  <AlertTriangle size={8} />
                                  {flag.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="max-w-[160px]">
                          {order.products.slice(0, 1).map((p, i) => (
                            <div key={i} className="text-xs text-gray-600 truncate">{p.name}</div>
                          ))}
                          {order.products.length > 1 && (
                            <div className="text-xs text-gray-400">+{order.products.length - 1} more</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin size={12} className="text-gray-400" />
                          {order.customerCity}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-bold text-[#1a1c3a]">
                          KES {order.totalAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-4 hidden xl:table-cell">
                        <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
            <span className="text-xs text-gray-400">
              Showing {filtered.length} of {mockOrders.length} orders
            </span>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100">Prev</button>
              <button className="px-3 py-1.5 text-xs bg-[#1a1c3a] text-white rounded-lg">1</button>
              <button className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100">Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Detail Modal (quick peek) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-[#1a1c3a]">Order Details</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{selectedOrder.trackingNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedOrder.status} />
                <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Customer</h4>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center font-bold text-[#1a1c3a]">
                      {selectedOrder.customerName[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-[#1a1c3a] text-sm">{selectedOrder.customerName}</div>
                      <div className="text-xs text-gray-500">{selectedOrder.customerPhone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                    <MapPin size={14} className="text-gray-400" />
                    {selectedOrder.customerAddress}, {selectedOrder.customerCity}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Products</h4>
                <div className="space-y-2">
                  {selectedOrder.products.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <div className="text-sm font-medium text-[#1a1c3a]">{p.name}</div>
                        {p.sku && <div className="text-xs text-gray-400">SKU: {p.sku}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-[#1a1c3a]">KES {(p.price * p.quantity).toLocaleString()}</div>
                        <div className="text-xs text-gray-400">Qty: {p.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="font-semibold text-sm text-[#1a1c3a]">Total</span>
                  <span className="font-bold text-[#f4991a]">KES {selectedOrder.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-100 rounded-xl p-3">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Link
                  href={`/dashboard/invoices?order=${selectedOrder.id}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#1a1c3a] text-white text-sm font-semibold py-3 rounded-xl hover:bg-[#252750] transition-all"
                >
                  <FileText size={16} />
                  View Invoice
                </Link>
                <button className="flex items-center justify-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium py-3 px-4 rounded-xl hover:bg-gray-50 transition-all">
                  <Phone size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
