'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { supabase } from '@/lib/supabase'
import { OrderStatus } from '@/lib/types'
import {
  Search, Download, Eye, Package, MapPin, FileText, X, Printer,
  CheckSquare, Square, ChevronRight,
} from 'lucide-react'
import { printOrderLabel, printOrderLabels, type PrintLabelProps } from '@/components/PrintLabel'
import Link from 'next/link'
import { detectDuplicates } from '@/lib/detectDuplicates'

type OrderRow = {
  id: string
  tracking_number: string
  customer_name: string
  customer_phone: string
  customer_city: string
  customer_address: string
  items: any[]
  total_amount: number
  original_total?: number | null
  status: string
  payment_method: string
  notes?: string | null
  cancel_reason?: string | null
  printed?: boolean
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

function orderToLabel(o: OrderRow): PrintLabelProps {
  return {
    id: o.id,
    tracking: o.tracking_number,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    customerAddress: o.customer_address || '',
    customerCity: o.customer_city,
    items: Array.isArray(o.items) ? o.items : [],
    totalAmount: o.total_amount,
    paymentMethod: o.payment_method,
  }
}

const PAGE_SIZE = 100

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [printQueue, setPrintQueue] = useState<Set<string>>(new Set())

  const addToPrintQueue = (id: string) => {
    const o = orders.find(x => x.id === id)
    if (!o || o.printed) return
    setPrintQueue(prev => { const n = new Set(prev); n.add(id); return n })
  }
  const removeFromPrintQueue = (id: string) => setPrintQueue(prev => { const n = new Set(prev); n.delete(id); return n })
  const queuedOrders = orders.filter(o => printQueue.has(o.id))
  const doPrint = async (ids: string[]) => {
    const toPrint = orders.filter(o => ids.includes(o.id))
    if (toPrint.length === 0) return
    printOrderLabels(toPrint.map(orderToLabel))
    await Promise.all(ids.map(id => supabase.from('orders').update({ printed: true }).eq('id', id)))
    setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, printed: true } : o))
    setPrintQueue(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      let q = supabase.from('orders').select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (statusFilter !== 'all') q = q.eq('status', statusFilter)
      if (search.trim()) {
        q = q.or(`tracking_number.ilike.%${search.trim()}%,customer_name.ilike.%${search.trim()}%,customer_phone.ilike.%${search.trim()}%,customer_city.ilike.%${search.trim()}%`)
      }
      const { data, count } = await q
      const rows = (data || []) as OrderRow[]

      const productIds = new Set<string>()
      rows.forEach(o => {
        if (Array.isArray(o.items)) o.items.forEach((it: any) => { if (it.product_id) productIds.add(it.product_id) })
      })
      if (productIds.size > 0) {
        const { data: products } = await supabase.from('products').select('id, image_url').in('id', [...productIds])
        if (products && products.length > 0) {
          const imgMap = new Map(products.map(p => [p.id, p.image_url]))
          rows.forEach(o => {
            if (Array.isArray(o.items)) {
              o.items = o.items.map((it: any) =>
                it.product_id && imgMap.has(it.product_id) ? { ...it, image_url: imgMap.get(it.product_id) } : it
              )
            }
          })
        }
      }

      setOrders(rows)
      setTotal(count || 0)
      setLoading(false)
    }
    load()
  }, [page, statusFilter, search])

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const duplicateMap = useMemo(() => detectDuplicates(orders), [orders])
  const filtered = orders

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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search orders..."
              className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] shadow-sm transition-all"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch('') }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(0) }}
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

          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-all shadow-sm">
              <Download size={13} />
              Export
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3.5 w-10">
                    <Printer size={13} className="mx-auto" />
                  </th>
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
                  <tr><td colSpan={9} className="text-center py-16 text-gray-400 text-sm">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-gray-400">
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
                        <td className="px-3 py-4 text-center" onClick={e => e.stopPropagation()}>
                          {order.printed ? (
                            <span className="inline-block text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Printed</span>
                          ) : (
                            <button
                              onClick={() => printQueue.has(order.id) ? removeFromPrintQueue(order.id) : addToPrintQueue(order.id)}
                              className="text-gray-300 hover:text-blue-600 transition-colors"
                            >
                              {printQueue.has(order.id) ? <CheckSquare size={15} className="text-blue-600" /> : <Square size={15} />}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono font-semibold text-[#1a1c3a]">{order.tracking_number}</span>
                            {duplicateMap.get(order.id)?.isDuplicate && (
                              <span className="text-[8px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 py-0.5 rounded" title={`Duplicate of ${duplicateMap.get(order.id)?.duplicateOf}`}>DUP</span>
                            )}
                          </div>
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
                          <div className="max-w-[200px] space-y-1">
                            {items.slice(0, 2).map((p, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                  {p.image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Package size={10} className="text-gray-300" />
                                  )}
                                </div>
                                <span className="text-xs text-gray-600 truncate">{p.name || 'Item'}</span>
                                <span className="text-[10px] text-[#f4991a] font-bold flex-shrink-0">×{p.quantity || 1}</span>
                              </div>
                            ))}
                            {items.length > 2 && (
                              <div className="text-[10px] text-gray-400 pl-7">+{items.length - 2} more</div>
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
                            {order.original_total && order.original_total !== order.total_amount && order.original_total > 0 && (
                              <span className="text-[9px] text-gray-400 line-through ml-1">KES {order.original_total.toLocaleString()}</span>
                            )}
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
                              onClick={() => {
                                printOrderLabel(orderToLabel(order))
                              }}
                              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all"
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
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} orders
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0 || loading}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50"
              >Prev</button>
              <button
                disabled={(page + 1) * PAGE_SIZE >= total || loading}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50"
              >Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* Print Orders — inline section below table */}
      <div className="px-6 pb-6">
        <div className="bg-blue-50 rounded-2xl border border-blue-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-blue-900 text-base flex items-center gap-2">
              <Printer size={16} /> Print Orders ({queuedOrders.length} selected)
            </h2>
            {queuedOrders.length > 0 && (
              <button
                onClick={() => doPrint(queuedOrders.map(o => o.id))}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
              >
                <Printer size={13} /> Print selected ({queuedOrders.length})
              </button>
            )}
          </div>

          {queuedOrders.length === 0 ? (
            <p className="text-sm text-blue-400 text-center py-6">Select orders from the table above using the checkboxes to add them here.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {queuedOrders.map((o) => (
                <div key={o.id} className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-blue-100 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1a1c3a] truncate">{o.customer_name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{o.tracking_number}</p>
                    <p className="text-[10px] text-gray-400 truncate">{o.customer_city}</p>
                  </div>
                  <button onClick={() => removeFromPrintQueue(o.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
