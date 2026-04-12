'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { incrementStockForOrderItems } from '@/lib/stock'
import { printOrderLabels, type PrintLabelProps } from '@/components/PrintLabel'
import {
  Search, Truck, CheckCircle, RotateCcw, Package, Phone,
  MessageCircle, X, ChevronDown, Printer, CheckSquare, Square,
  MapPin, Clock, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  printed?: boolean
  notes?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  returned_at?: string | null
  created_at: string
  seller_id?: string | null
}

type ShipStatus = 'confirmed' | 'prepared' | 'shipped' | 'delivered' | 'returned'

const statusConfig: Record<ShipStatus, { label: string; color: string; border: string; bg: string }> = {
  confirmed: { label: 'Confirmed',  color: 'text-emerald-600', border: 'border-emerald-400', bg: 'bg-emerald-50' },
  prepared:  { label: 'Prepared',   color: 'text-indigo-600',  border: 'border-indigo-400',  bg: 'bg-indigo-50'  },
  shipped:   { label: 'Shipped',    color: 'text-blue-600',    border: 'border-blue-400',    bg: 'bg-blue-50'    },
  delivered: { label: 'Delivered',  color: 'text-sky-600',     border: 'border-sky-400',     bg: 'bg-sky-50'     },
  returned:  { label: 'Returned',   color: 'text-red-600',     border: 'border-red-400',     bg: 'bg-red-50'     },
}

const allStatuses: ShipStatus[] = ['confirmed', 'prepared', 'shipped', 'delivered', 'returned']

function cleanPhone(p: string) { return (p || '').replace(/[^\d+]/g, '') }
function whatsappLink(phone: string, text: string) {
  const num = cleanPhone(phone).replace(/^\+/, '')
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}

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

export default function AdminShippingPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ShipStatus | 'all'>('all')
  const [processing, setProcessing] = useState<string | null>(null)

  // Print queue
  const [printQueue, setPrintQueue] = useState<Set<string>>(new Set())

  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['confirmed', 'prepared', 'shipped', 'delivered', 'returned'])
      .order('created_at', { ascending: false })
    setOrders((data || []) as OrderRow[])
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [])

  // Search by tracking number or phone
  const filtered = orders.filter(o => {
    const q = search.toLowerCase().trim()
    const matchesSearch = !q ||
      o.tracking_number?.toLowerCase().includes(q) ||
      o.customer_phone?.includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_city?.toLowerCase().includes(q)
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Status counts
  const counts = allStatuses.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length
    return acc
  }, {} as Record<ShipStatus, number>)

  // Change order status
  const changeStatus = async (orderId: string, newStatus: string) => {
    setProcessing(orderId)
    const patch: any = { status: newStatus }

    if (newStatus === 'shipped') patch.shipped_at = new Date().toISOString()
    if (newStatus === 'delivered') patch.delivered_at = new Date().toISOString()
    if (newStatus === 'returned') {
      patch.returned_at = new Date().toISOString()
      // Restore stock
      const order = orders.find(o => o.id === orderId)
      if (order) await incrementStockForOrderItems(order.items)
    }

    await supabase.from('orders').update(patch).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o))
    setProcessing(null)
  }

  // Print helpers
  const togglePrintQueue = (id: string) => {
    setPrintQueue(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const queuedOrders = orders.filter(o => printQueue.has(o.id))
  const doPrint = async (ids: string[]) => {
    const toPrint = orders.filter(o => ids.includes(o.id))
    if (toPrint.length === 0) return
    printOrderLabels(toPrint.map(orderToLabel))
    await Promise.all(ids.map(id => supabase.from('orders').update({ printed: true }).eq('id', id)))
    setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, printed: true } : o))
    setPrintQueue(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
  }

  return (
    <div className="min-h-screen">
      <Header title="Shipping" subtitle={`${orders.length} delivery orders`} />

      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          {allStatuses.map(s => {
            const cfg = statusConfig[s]
            return (
              <button
                key={s}
                onClick={() => { setFilterStatus(filterStatus === s ? 'all' : s) }}
                className={cn(
                  'bg-white rounded-xl border shadow-sm p-3.5 text-left transition-all hover:shadow-md',
                  filterStatus === s ? `border-2 ${cfg.border}` : 'border-gray-100'
                )}
              >
                <p className={cn('text-xl font-bold', cfg.color)}>{counts[s]}</p>
                <p className="text-xs text-gray-400 mt-0.5">{cfg.label}</p>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by tracking number, phone, name, city..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X size={13} />
              </button>
            )}
          </div>
          {printQueue.size > 0 && (
            <button
              onClick={() => doPrint(Array.from(printQueue))}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all"
            >
              <Printer size={13} /> Print selected ({printQueue.size})
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="text-center px-3 py-3 w-10"><Printer size={13} className="mx-auto text-gray-400" /></th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Tracking</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">City</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <Truck size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No orders found</p>
                  </td>
                </tr>
              ) : filtered.map(order => (
                <ShippingRow
                  key={order.id}
                  order={order}
                  inPrintQueue={printQueue.has(order.id)}
                  onTogglePrint={() => togglePrintQueue(order.id)}
                  onChangeStatus={(s) => changeStatus(order.id, s)}
                  processing={processing === order.id}
                />
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">Showing {filtered.length} of {orders.length} orders</span>
          </div>
        </div>

        {/* Print queue section */}
        {queuedOrders.length > 0 && (
          <div className="bg-blue-50 rounded-2xl border border-blue-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-blue-900 text-base flex items-center gap-2">
                <Printer size={16} /> Print Queue ({queuedOrders.length})
              </h2>
              <button
                onClick={() => doPrint(queuedOrders.map(o => o.id))}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
              >
                <Printer size={13} /> Print all ({queuedOrders.length})
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {queuedOrders.map(o => (
                <div key={o.id} className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-blue-100 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1a1c3a] truncate">{o.customer_name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{o.tracking_number}</p>
                  </div>
                  <button onClick={() => togglePrintQueue(o.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Shipping Row ── */
function ShippingRow({ order, inPrintQueue, onTogglePrint, onChangeStatus, processing }: {
  order: OrderRow
  inPrintQueue: boolean
  onTogglePrint: () => void
  onChangeStatus: (s: string) => void
  processing: boolean
}) {
  const [statusOpen, setStatusOpen] = useState(false)
  const cfg = statusConfig[order.status as ShipStatus] || statusConfig.confirmed

  return (
    <tr className="hover:bg-gray-50/50">
      {/* Print checkbox */}
      <td className="px-3 py-3 text-center">
        {order.printed ? (
          <span className="inline-block text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Printed</span>
        ) : (
          <button onClick={onTogglePrint} className="text-gray-300 hover:text-blue-600 transition-colors">
            {inPrintQueue ? <CheckSquare size={15} className="text-blue-600" /> : <Square size={15} />}
          </button>
        )}
      </td>

      {/* Tracking */}
      <td className="px-4 py-3">
        <p className="text-xs font-mono font-semibold text-[#1a1c3a]">{order.tracking_number}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{order.payment_method}</p>
      </td>

      {/* Customer */}
      <td className="px-4 py-3">
        <p className="text-xs font-semibold text-[#1a1c3a]">{order.customer_name}</p>
        <p className="text-[10px] text-gray-400">{order.customer_phone}</p>
      </td>

      {/* City */}
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <MapPin size={11} className="text-gray-400" />
          {order.customer_city}
        </div>
      </td>

      {/* Amount */}
      <td className="px-4 py-3">
        <span className="text-xs font-bold text-[#1a1c3a]">KES {(order.total_amount || 0).toLocaleString()}</span>
      </td>

      {/* Status dropdown */}
      <td className="px-4 py-3">
        <div className="relative">
          <button
            onClick={() => setStatusOpen(v => !v)}
            disabled={processing}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all',
              cfg.color, cfg.border, processing && 'opacity-50'
            )}
          >
            {cfg.label}
            <ChevronDown size={10} className={cn('transition-transform', statusOpen && 'rotate-180')} />
          </button>

          {statusOpen && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 min-w-[160px]">
              {allStatuses.map(s => {
                const c = statusConfig[s]
                return (
                  <button
                    key={s}
                    onClick={() => { onChangeStatus(s); setStatusOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors text-left',
                      order.status === s ? c.color : 'text-gray-600'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', c.bg, c.border.replace('border-', 'bg-').replace('400', '500'))} />
                    {c.label}
                    {order.status === s && <CheckCircle size={11} className="ml-auto" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <a
            href={`tel:${cleanPhone(order.customer_phone)}`}
            className="w-7 h-7 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500 transition-all"
            title="Call"
          >
            <Phone size={12} />
          </a>
          <a
            href={whatsappLink(order.customer_phone, `Hello 👋 ${order.customer_name}, your order for ${(Array.isArray(order.items) ? order.items : []).map((it: any) => { const q = Number(it.quantity) || 1; return q > 1 ? `${it.name || 'Item'} (x${q})` : (it.name || 'Item') }).join(', ')} is on its way 🚚. Please confirm your availability for delivery.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-all"
            title="WhatsApp"
          >
            <MessageCircle size={12} />
          </a>
        </div>
      </td>
    </tr>
  )
}
