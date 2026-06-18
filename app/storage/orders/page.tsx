'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { incrementStockForOrderItems } from '@/lib/stock'
import { printOrderLabels, type PrintLabelProps } from '@/components/PrintLabel'
import {
  Search, Truck, CheckCircle, RotateCcw, Package, Phone, MapPin,
  X, ChevronDown, Calendar, Printer, CheckSquare, Square,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type OrderRow = {
  id: string
  tracking_number: string
  delivery_tracking?: string | null
  customer_name: string
  customer_phone: string
  customer_city: string
  customer_address: string
  items: any[]
  total_amount: number
  status: string
  payment_method: string
  printed?: boolean
  print_count?: number
  notes?: string | null
  last_call_note?: string | null
  shipped_to_agent_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  returned_at?: string | null
  last_call_at?: string | null
  created_at: string
}

const COLS = 'id, tracking_number, delivery_tracking, customer_name, customer_phone, customer_city, customer_address, items, total_amount, status, payment_method, printed, print_count, notes, last_call_note, shipped_to_agent_at, shipped_at, delivered_at, returned_at, last_call_at, created_at'

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  confirmed:        { label: 'Confirmed',        color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  prepared:         { label: 'Prepared',         color: 'text-indigo-600',  bg: 'bg-indigo-50 border-indigo-200'   },
  shipped_to_agent: { label: 'Sent to Agent',    color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200'   },
  shipped:          { label: 'Shipped',          color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200'       },
  delivered:        { label: 'Delivered',        color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-200'         },
  returned:         { label: 'Returned',         color: 'text-red-600',     bg: 'bg-red-50 border-red-200'         },
}

const allStatuses = ['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'returned']
type DatePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month'

function getDateRange(preset: DatePreset): { from: Date | null; to: Date | null } {
  const now = new Date()
  const sod = (d: Date) => { const c = new Date(d); c.setHours(0,0,0,0); return c }
  const eod = (d: Date) => { const c = new Date(d); c.setHours(23,59,59,999); return c }
  switch (preset) {
    case 'today': return { from: sod(now), to: eod(now) }
    case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: sod(y), to: eod(y) } }
    case 'this_week': { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return { from: sod(d), to: eod(now) } }
    case 'this_month': { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { from: sod(d), to: eod(now) } }
    default: return { from: null, to: null }
  }
}

function getStatusDate(o: OrderRow): string {
  if (o.status === 'delivered' && o.delivered_at) return o.delivered_at
  if (o.status === 'shipped' && o.shipped_at) return o.shipped_at
  if (o.status === 'returned' && o.returned_at) return o.returned_at
  if (o.status === 'shipped_to_agent' && o.shipped_to_agent_at) return o.shipped_to_agent_at
  if ((o.status === 'confirmed' || o.status === 'prepared') && o.last_call_at) return o.last_call_at
  return o.created_at
}

function cleanPhone(p: string) {
  let num = (p || '').replace(/[^\d+]/g, '')
  if (/^0[17]\d{8}$/.test(num)) num = '254' + num.slice(1)
  return num
}

function orderToLabel(o: OrderRow): PrintLabelProps {
  return {
    id: o.id, tracking: o.tracking_number, customerName: o.customer_name,
    customerPhone: o.customer_phone, customerAddress: o.customer_address || '',
    customerCity: o.customer_city, items: Array.isArray(o.items) ? o.items : [],
    totalAmount: o.total_amount, paymentMethod: o.payment_method,
  }
}

export default function StorageOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [processing, setProcessing] = useState<string | null>(null)
  const [printQueue, setPrintQueue] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.from('orders').select(COLS)
      .in('status', allStatuses)
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data }) => { setOrders((data || []) as OrderRow[]); setLoading(false) })
  }, [])

  // Realtime updates
  useEffect(() => {
    const channel = supabase.channel('storage-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const row = payload.new as OrderRow
          setOrders(prev => {
            const exists = prev.some(o => o.id === row.id)
            if (exists) return prev.map(o => o.id === row.id ? row : o)
            if (allStatuses.includes(row.status)) return [row, ...prev]
            return prev
          })
        } else if (payload.eventType === 'INSERT') {
          const row = payload.new as OrderRow
          if (allStatuses.includes(row.status)) setOrders(prev => [row, ...prev])
        }
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const { from: dateFrom, to: dateTo } = useMemo(() => getDateRange(datePreset), [datePreset])

  const counts = useMemo(() => {
    const acc: Record<string, number> = {}
    allStatuses.forEach(s => { acc[s] = 0 })
    orders.forEach(o => {
      const d = new Date(getStatusDate(o))
      if (dateFrom && d < dateFrom) return
      if (dateTo && d > dateTo) return
      if (acc[o.status] !== undefined) acc[o.status]++
    })
    return acc
  }, [orders, dateFrom, dateTo])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return orders.filter(o => {
      if (filterStatus !== 'all' && o.status !== filterStatus) return false
      const d = new Date(getStatusDate(o))
      if (dateFrom && d < dateFrom) return false
      if (dateTo && d > dateTo) return false
      if (!q) return true
      return (
        o.tracking_number?.toLowerCase().includes(q) ||
        (o.delivery_tracking || '').toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.customer_city?.toLowerCase().includes(q)
      )
    })
  }, [orders, search, filterStatus, dateFrom, dateTo])

  const changeStatus = async (orderId: string, newStatus: string) => {
    setProcessing(orderId)
    const patch: any = { status: newStatus }
    if (newStatus === 'prepared') { patch.shipped_to_agent_at = null; patch.shipped_at = null; patch.delivered_at = null; patch.returned_at = null }
    if (newStatus === 'shipped_to_agent') patch.shipped_to_agent_at = new Date().toISOString()
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

  const returnToStock = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    setProcessing(orderId)
    await incrementStockForOrderItems(order.items)
    await supabase.from('orders').update({
      status: 'returned',
      returned_at: new Date().toISOString(),
    }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'returned', returned_at: new Date().toISOString() } : o))
    setProcessing(null)
  }

  const togglePrintQueue = (id: string) => {
    setPrintQueue(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const doPrint = async (ids: string[]) => {
    const toPrint = orders.filter(o => ids.includes(o.id))
    if (toPrint.length === 0) return
    printOrderLabels(toPrint.map(orderToLabel))
    await Promise.all(ids.map(id =>
      supabase.from('orders').update({ printed: true, print_count: (orders.find(o => o.id === id)?.print_count || 0) + 1 }).eq('id', id)
    ))
    setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, printed: true, print_count: (o.print_count || 0) + 1 } : o))
    setPrintQueue(new Set())
  }

  const datePresets: { value: DatePreset; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
  ]

  return (
    <div className="p-6 space-y-4">
      {/* Status cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {allStatuses.map(s => {
          const cfg = statusConfig[s]
          return (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
              className={cn('bg-white rounded-xl border shadow-sm p-3 text-left transition-all hover:shadow-md',
                filterStatus === s ? `border-2 ${cfg.bg}` : 'border-gray-100')}>
              <p className={cn('text-lg font-bold', cfg.color)}>{counts[s] || 0}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Date + Search + Print */}
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar size={14} className="text-gray-400" />
        {datePresets.map(dp => (
          <button key={dp.value} onClick={() => setDatePreset(datePreset === dp.value ? 'all' : dp.value)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              datePreset === dp.value ? 'bg-[#f4991a] text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300')}>
            {dp.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tracking, name, phone, city..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X size={13} /></button>}
        </div>
        {printQueue.size > 0 && (
          <button onClick={() => doPrint(Array.from(printQueue))}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl">
            <Printer size={13} /> Print ({printQueue.size})
          </button>
        )}
      </div>

      {/* Orders */}
      <div className="space-y-1.5">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-sm text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : filtered.map(order => {
          const cfg = statusConfig[order.status] || statusConfig.confirmed
          return (
            <div key={order.id} className={cn('bg-white rounded-xl border shadow-sm', cfg.bg)}>
              <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-50 bg-gray-50/40">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <button onClick={() => togglePrintQueue(order.id)} className="text-gray-300 hover:text-blue-600">
                    {printQueue.has(order.id) ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} />}
                  </button>
                  {(order.print_count || 0) > 0 && (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">{order.print_count}x Printed</span>
                  )}
                  <span className="text-xs font-mono font-bold text-[#1a1c3a]">{order.tracking_number}</span>
                  {order.delivery_tracking && (
                    <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">{order.delivery_tracking}</span>
                  )}
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.color, cfg.bg)}>{cfg.label}</span>
                  <span className="text-[10px] text-gray-400">{order.payment_method}</span>
                  {(order.total_amount || 0) > 0 && (
                    <span className="text-xs font-bold text-[#f4991a]">KES {order.total_amount.toLocaleString()}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a href={`tel:${cleanPhone(order.customer_phone)}`}
                    className="w-7 h-7 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500">
                    <Phone size={12} />
                  </a>
                  {order.status === 'confirmed' && (
                    <button disabled={processing === order.id} onClick={() => changeStatus(order.id, 'prepared')}
                      className="px-2.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg">Prepared</button>
                  )}
                  {order.status === 'prepared' && (
                    <button disabled={processing === order.id} onClick={() => changeStatus(order.id, 'shipped_to_agent')}
                      className="px-2.5 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg">Send to Agent</button>
                  )}
                  {(order.status === 'shipped_to_agent' || order.status === 'shipped') && (
                    <button disabled={processing === order.id} onClick={() => returnToStock(order.id)}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[10px] font-bold rounded-lg">
                      <RotateCcw size={10} className="inline mr-1" />Return to Stock
                    </button>
                  )}
                </div>
              </div>
              <div className="px-4 py-2.5 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#1a1c3a]">{order.customer_name}</p>
                  <span className="text-xs text-gray-400">{order.customer_phone}</span>
                  <span className="text-xs text-gray-400">{order.customer_city}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                  <Package size={12} className="text-gray-300 flex-shrink-0" />
                  {(Array.isArray(order.items) ? order.items : []).map((it: any, i: number) => (
                    <span key={i} className="font-medium">{it.name || 'Item'} x{it.quantity || 1}{i < order.items.length - 1 ? ' · ' : ''}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {order.last_call_at && <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg"><Calendar size={10} className="inline mr-1" />Confirmed: {new Date(order.last_call_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>}
                  {order.shipped_to_agent_at && <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg"><Truck size={10} className="inline mr-1" />Sent: {new Date(order.shipped_to_agent_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>}
                  {order.returned_at && <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg"><RotateCcw size={10} className="inline mr-1" />Returned: {new Date(order.returned_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>}
                </div>
                {order.notes && <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">{order.notes}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
