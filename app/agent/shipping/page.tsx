'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { incrementStockForOrderItems } from '@/lib/stock'
import { printOrderLabels, type PrintLabelProps } from '@/components/PrintLabel'
import {
  Search, Truck, CheckCircle, RotateCcw, Package, Phone,
  MessageCircle, X, ChevronDown, Printer, CheckSquare, Square,
  MapPin, Clock, AlertCircle, PhoneOff,
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

export default function AgentShippingPage() {
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

  const counts = allStatuses.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length
    return acc
  }, {} as Record<ShipStatus, number>)

  const changeStatus = async (orderId: string, newStatus: string) => {
    setProcessing(orderId)
    const patch: any = { status: newStatus }

    if (newStatus === 'shipped') patch.shipped_at = new Date().toISOString()
    if (newStatus === 'delivered') patch.delivered_at = new Date().toISOString()
    if (newStatus === 'returned') {
      patch.returned_at = new Date().toISOString()
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
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-[#1a1c3a] text-lg flex items-center gap-2"><Truck size={18} /> Shipping</h1>
          <p className="text-xs text-gray-400 mt-0.5">{orders.length} delivery orders &middot; Follow up & manage</p>
        </div>
        <button
          onClick={() => { setLoading(true); loadOrders() }}
          className="text-xs font-semibold text-[#f4991a] hover:text-orange-600"
        >
          Refresh
        </button>
      </div>

      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-2">
          {allStatuses.map(s => {
            const cfg = statusConfig[s]
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                className={cn(
                  'bg-white rounded-xl border shadow-sm p-3 text-left transition-all hover:shadow-md',
                  filterStatus === s ? `border-2 ${cfg.border}` : 'border-gray-100'
                )}
              >
                <p className={cn('text-lg font-bold', cfg.color)}>{counts[s]}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{cfg.label}</p>
              </button>
            )
          })}
        </div>

        {/* Search + print */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by tracking, phone, name, city..."
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

        {/* Orders list */}
        <div className="space-y-2">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-sm text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
              <Truck size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders found</p>
            </div>
          ) : filtered.map(order => {
            const cfg = statusConfig[order.status as ShipStatus] || statusConfig.confirmed
            return (
              <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  {/* Print checkbox */}
                  <div className="pt-1">
                    {order.printed ? (
                      <span className="inline-block text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">Printed</span>
                    ) : (
                      <button onClick={() => togglePrintQueue(order.id)} className="text-gray-300 hover:text-blue-600">
                        {printQueue.has(order.id) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                      </button>
                    )}
                  </div>

                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-[#1a1c3a]">{order.tracking_number}</span>
                      <span className="text-[10px] text-gray-400">{order.payment_method}</span>
                    </div>
                    <p className="text-sm font-semibold text-[#1a1c3a]">{order.customer_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Phone size={10} /> {order.customer_phone}</span>
                      <span className="flex items-center gap-1"><MapPin size={10} /> {order.customer_city}</span>
                    </div>
                    <p className="text-xs font-bold text-[#f4991a] mt-1">KES {(order.total_amount || 0).toLocaleString()}</p>
                  </div>

                  {/* Status + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Call & WhatsApp */}
                    <a
                      href={`tel:${cleanPhone(order.customer_phone)}`}
                      className="w-8 h-8 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500 transition-all"
                      title="Call"
                    >
                      <Phone size={13} />
                    </a>
                    <a
                      href={whatsappLink(order.customer_phone, `Hello 👋 ${order.customer_name}, your order *${order.tracking_number}* for ${(Array.isArray(order.items) ? order.items : []).map((it: any) => { const q = Number(it.quantity) || 1; return q > 1 ? `${it.name || 'Item'} (x${q})` : (it.name || 'Item') }).join(', ')} is on its way 🚚. Please confirm your availability for delivery.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-all"
                      title="WhatsApp"
                    >
                      <MessageCircle size={13} />
                    </a>

                    {/* Status dropdown */}
                    <StatusDropdown
                      currentStatus={order.status as ShipStatus}
                      processing={processing === order.id}
                      onChangeStatus={(s) => changeStatus(order.id, s)}
                    />
                  </div>
                </div>

                {/* Items preview */}
                <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                  <Package size={10} />
                  {(Array.isArray(order.items) ? order.items : []).map((it: any, i: number) => (
                    <span key={i}>{it.name || 'Item'} x{it.quantity || 1}{i < order.items.length - 1 ? ',' : ''}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Print queue */}
        {queuedOrders.length > 0 && (
          <div className="bg-blue-50 rounded-2xl border border-blue-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                <Printer size={14} /> Print Queue ({queuedOrders.length})
              </h3>
              <button
                onClick={() => doPrint(queuedOrders.map(o => o.id))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
              >
                <Printer size={12} /> Print all
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
              {queuedOrders.map(o => (
                <div key={o.id} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-blue-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1a1c3a] truncate">{o.customer_name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{o.tracking_number}</p>
                  </div>
                  <button onClick={() => togglePrintQueue(o.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                    <X size={12} />
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

/* ── Status Dropdown Component ── */
function StatusDropdown({ currentStatus, processing, onChangeStatus }: {
  currentStatus: ShipStatus
  processing: boolean
  onChangeStatus: (s: string) => void
}) {
  const [open, setOpen] = useState(false)
  const cfg = statusConfig[currentStatus] || statusConfig.confirmed

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={processing}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-full border-2 text-[11px] font-semibold transition-all',
          cfg.color, cfg.border, processing && 'opacity-50'
        )}
      >
        {cfg.label}
        <ChevronDown size={10} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 min-w-[150px]">
            {allStatuses.map(s => {
              const c = statusConfig[s]
              return (
                <button
                  key={s}
                  onClick={() => { onChangeStatus(s); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors text-left',
                    currentStatus === s ? c.color : 'text-gray-600'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', {
                    'bg-emerald-500': s === 'confirmed',
                    'bg-indigo-500':  s === 'prepared',
                    'bg-blue-500':    s === 'shipped',
                    'bg-sky-500':     s === 'delivered',
                    'bg-red-500':     s === 'returned',
                  })} />
                  {c.label}
                  {currentStatus === s && <CheckCircle size={11} className="ml-auto" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
