'use client'

import { useEffect, useState, useMemo } from 'react'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { incrementStockForOrderItems } from '@/lib/stock'
import { printOrderLabels, type PrintLabelProps } from '@/components/PrintLabel'
import {
  Search, Truck, CheckCircle, RotateCcw, Package, Phone,
  MessageCircle, X, ChevronDown, ChevronUp, Printer, CheckSquare, Square,
  MapPin, Clock, AlertCircle, Calendar, UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { KENYAN_CITIES, resolveCity } from '@/lib/kenyanCities'

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
  printed?: boolean
  print_count?: number
  notes?: string | null
  shipped_at?: string | null
  shipped_to_agent_at?: string | null
  delivered_at?: string | null
  returned_at?: string | null
  last_call_at?: string | null
  created_at: string
  seller_id?: string | null
}

type ShipStatus = 'confirmed' | 'prepared' | 'shipped_to_agent' | 'shipped' | 'delivered' | 'returned'

const statusConfig: Record<ShipStatus, { label: string; color: string; border: string; bg: string }> = {
  confirmed:        { label: 'Confirmed',        color: 'text-emerald-600', border: 'border-emerald-400', bg: 'bg-emerald-50' },
  prepared:         { label: 'Prepared',         color: 'text-indigo-600',  border: 'border-indigo-400',  bg: 'bg-indigo-50'  },
  shipped_to_agent: { label: 'Shipped to Agent', color: 'text-purple-600',  border: 'border-purple-400',  bg: 'bg-purple-50'  },
  shipped:          { label: 'Shipped',          color: 'text-blue-600',    border: 'border-blue-400',    bg: 'bg-blue-50'    },
  delivered:        { label: 'Delivered',        color: 'text-sky-600',     border: 'border-sky-400',     bg: 'bg-sky-50'     },
  returned:         { label: 'Returned',         color: 'text-red-600',     border: 'border-red-400',     bg: 'bg-red-50'     },
}

const allStatuses: ShipStatus[] = ['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'returned']

type DatePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom'
const datePresets: { value: DatePreset; label: string }[] = [
  { value: 'all',        label: 'All Time' },
  { value: 'today',      label: 'Today' },
  { value: 'yesterday',  label: 'Yesterday' },
  { value: 'this_week',  label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom',     label: 'Custom' },
]

function getDateRange(preset: DatePreset, customFrom?: string, customTo?: string): { from: Date | null; to: Date | null } {
  const now = new Date()
  const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0,0,0,0); return c }
  const endOfDay = (d: Date) => { const c = new Date(d); c.setHours(23,59,59,999); return c }
  switch (preset) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now) }
    case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: startOfDay(y), to: endOfDay(y) } }
    case 'this_week': { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return { from: startOfDay(d), to: endOfDay(now) } }
    case 'this_month': { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { from: startOfDay(d), to: endOfDay(now) } }
    case 'last_month': { const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { from: startOfDay(d), to: endOfDay(e) } }
    case 'custom': {
      const f = customFrom ? startOfDay(new Date(customFrom)) : null
      const t = customTo ? endOfDay(new Date(customTo)) : null
      return { from: f, to: t }
    }
    default: return { from: null, to: null }
  }
}

function getStatusDate(o: any): string {
  if (o.status === 'delivered' && o.delivered_at) return o.delivered_at
  if (o.status === 'shipped' && o.shipped_at) return o.shipped_at
  if (o.status === 'returned' && o.returned_at) return o.returned_at
  if (o.status === 'shipped_to_agent' && o.shipped_to_agent_at) return o.shipped_to_agent_at
  if ((o.status === 'confirmed' || o.status === 'prepared') && o.last_call_at) return o.last_call_at
  return o.created_at
}

function cleanPhone(p: string) { return (p || '').replace(/[^\d+]/g, '') }
function whatsappLink(phone: string, text: string) {
  const num = cleanPhone(phone).replace(/^\+/, '')
  return `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(text)}`
}

async function logWhatsAppContact(orderId: string, adminId: string, adminName: string, customerName: string) {
  try {
    await supabase.from('call_logs').insert({
      order_id: orderId,
      agent_id: adminId,
      agent_name: adminName,
      action: 'whatsapp_contact',
      note: `WhatsApp message sent to ${customerName}`,
    })
  } catch (err) {
    console.error('Failed to log WhatsApp contact:', err)
  }
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
  const [filterProduct, setFilterProduct] = useState<string>('all')
  const [filterCity, setFilterCity] = useState<string>('all')
  const [citiesExpanded, setCitiesExpanded] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // Print queue
  const [printQueue, setPrintQueue] = useState<Set<string>>(new Set())

  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, printed, print_count, notes, last_call_note, shipped_at, shipped_to_agent_at, delivered_at, returned_at, last_call_at, created_at, seller_id, call_attempts, reminded_at, cancel_reason, assigned_agent_id')
      .in('status', ['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'returned'])
      .order('created_at', { ascending: false })
      .limit(2000)
    const rows = (data || []) as OrderRow[]
    rows.forEach(o => {
      if ((!o.total_amount || o.total_amount === 0) && Array.isArray(o.items)) {
        const calc = o.items.reduce((s: number, it: any) => s + (Number(it.unit_price || it.price || 0) * (Number(it.quantity) || 1)), 0)
        if (calc > 0) o.total_amount = calc
      }
    })
    setOrders(rows)
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [])

  const cityByOrderId = useMemo(() => {
    const m = new Map<string, string | null>()
    orders.forEach(o => m.set(o.id, resolveCity(o.customer_city, o.customer_address)))
    return m
  }, [orders])

  const productOptions = useMemo(() => {
    const set = new Map<string, string>()
    orders.forEach((o: any) => {
      const items = Array.isArray(o.items) ? o.items : []
      items.forEach((it: any) => {
        const name = (it.name || '').trim()
        if (name) set.set(name.toLowerCase(), name)
      })
    })
    return Array.from(set.values()).sort()
  }, [orders])

  const cityOptions = useMemo(() => {
    const present = new Set<string>()
    cityByOrderId.forEach(c => { if (c) present.add(c) })
    return KENYAN_CITIES.filter(c => present.has(c))
  }, [cityByOrderId])

  const { from: dateFrom, to: dateTo } = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  )

  const baseFiltered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const productLower = filterProduct.toLowerCase()
    return orders.filter((o: any) => {
      const matchesSearch = !q ||
        o.tracking_number?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_city?.toLowerCase().includes(q) ||
        o.customer_address?.toLowerCase().includes(q)
      if (!matchesSearch) return false
      const statusDate = new Date(getStatusDate(o))
      if (dateFrom && statusDate < dateFrom) return false
      if (dateTo && statusDate > dateTo) return false
      if (filterProduct !== 'all') {
        if (!Array.isArray(o.items)) return false
        if (!o.items.some((it: any) => (it.name || '').toLowerCase() === productLower)) return false
      }
      if (filterCity !== 'all' && cityByOrderId.get(o.id) !== filterCity) return false
      return true
    })
  }, [orders, search, dateFrom, dateTo, filterProduct, filterCity, cityByOrderId])

  const filtered = useMemo(
    () => filterStatus === 'all' ? baseFiltered : baseFiltered.filter(o => o.status === filterStatus),
    [baseFiltered, filterStatus],
  )

  const counts = useMemo(() => {
    const acc = {} as Record<ShipStatus, number>
    allStatuses.forEach(s => { acc[s] = 0 })
    baseFiltered.forEach(o => {
      const s = o.status as ShipStatus
      if (acc[s] !== undefined) acc[s]++
    })
    return acc
  }, [baseFiltered])

  const cityBreakdown = useMemo(() => {
    const q = search.toLowerCase().trim()
    const productLower = filterProduct.toLowerCase()
    const map = new Map<string, { total: number; delivered: number; shipped: number; pending: number }>()
    orders.forEach((o: any) => {
      const matchesSearch = !q ||
        o.tracking_number?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_city?.toLowerCase().includes(q) ||
        o.customer_address?.toLowerCase().includes(q)
      if (!matchesSearch) return
      const statusDate = new Date(getStatusDate(o))
      if (dateFrom && statusDate < dateFrom) return
      if (dateTo && statusDate > dateTo) return
      if (filterProduct !== 'all') {
        if (!Array.isArray(o.items)) return
        if (!o.items.some((it: any) => (it.name || '').toLowerCase() === productLower)) return
      }
      const c = cityByOrderId.get(o.id)
      if (!c) return
      const cur = map.get(c) || { total: 0, delivered: 0, shipped: 0, pending: 0 }
      cur.total++
      if (o.status === 'delivered') cur.delivered++
      if (o.status === 'shipped' || o.status === 'shipped_to_agent') cur.shipped++
      if (o.status === 'confirmed' || o.status === 'prepared') cur.pending++
      map.set(c, cur)
    })
    return Array.from(map.entries())
      .map(([city, stats]) => ({ city, ...stats }))
      .sort((a, b) => b.total - a.total)
  }, [orders, search, dateFrom, dateTo, filterProduct, cityByOrderId])

  // Change order status
  const changeStatus = async (orderId: string, newStatus: string) => {
    setProcessing(orderId)
    const patch: any = { status: newStatus }

    if (newStatus === 'shipped_to_agent') patch.shipped_to_agent_at = new Date().toISOString()
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
    const nextCounts = new Map<string, number>()
    toPrint.forEach(o => nextCounts.set(o.id, (o.print_count || 0) + 1))
    await Promise.all(
      Array.from(nextCounts.entries()).map(([id, c]) =>
        supabase.from('orders').update({ printed: true, print_count: c }).eq('id', id),
      ),
    )
    setOrders(prev => prev.map(o => nextCounts.has(o.id)
      ? { ...o, printed: true, print_count: nextCounts.get(o.id)! }
      : o))
    setPrintQueue(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
  }

  return (
    <div className="min-h-screen">
      <Header title="Shipping" subtitle={`${orders.length} delivery orders`} />

      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
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

        {/* Date filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={14} className="text-gray-400" />
          {datePresets.map(dp => (
            <button
              key={dp.value}
              onClick={() => setDatePreset(datePreset === dp.value ? 'all' : dp.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                datePreset === dp.value
                  ? 'bg-[#f4991a] text-white shadow-sm shadow-orange-500/30'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              )}
            >
              {dp.label}
            </button>
          ))}
        </div>
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#f4991a]" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#f4991a]" />
          </div>
        )}

        {/* Filters row: Search | Product | City | Clear */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tracking, phone, name, city, address..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X size={13} />
              </button>
            )}
          </div>

          <select
            value={filterProduct}
            onChange={e => setFilterProduct(e.target.value)}
            className={cn(
              'px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all bg-white focus:outline-none focus:border-[#f4991a] min-w-[160px]',
              filterProduct !== 'all' ? 'border-[#f4991a] text-[#f4991a]' : 'border-gray-200 text-gray-500'
            )}
          >
            <option value="all">All Products</option>
            {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            value={filterCity}
            onChange={e => setFilterCity(e.target.value)}
            className={cn(
              'px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all bg-white focus:outline-none focus:border-[#f4991a] min-w-[160px]',
              filterCity !== 'all' ? 'border-[#f4991a] text-[#f4991a]' : 'border-gray-200 text-gray-500'
            )}
          >
            <option value="all">All Cities</option>
            {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {(filterProduct !== 'all' || filterCity !== 'all' || search || filterStatus !== 'all') && (
            <button
              onClick={() => { setFilterProduct('all'); setFilterCity('all'); setSearch(''); setFilterStatus('all') }}
              className="px-3 py-2.5 text-xs font-semibold text-gray-500 hover:text-[#f4991a] flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>
          )}

          {printQueue.size > 0 && (
            <button
              onClick={() => doPrint(Array.from(printQueue))}
              className="ml-auto flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all"
            >
              <Printer size={13} /> Print ({printQueue.size})
            </button>
          )}
        </div>

        {/* Cities breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setCitiesExpanded(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-[#f4991a]" />
              <span className="text-sm font-bold text-[#1a1c3a]">Cities in Kenya</span>
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {cityBreakdown.length} towns · {cityBreakdown.reduce((s, c) => s + c.total, 0)} orders
              </span>
            </div>
            {citiesExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>
          {citiesExpanded && (
            <div className="px-5 pb-5 pt-1 max-h-[400px] overflow-y-auto">
              {cityBreakdown.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No cities in current filter</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                  {cityBreakdown.map(c => (
                    <button
                      key={c.city}
                      onClick={() => setFilterCity(filterCity === c.city ? 'all' : c.city)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all',
                        filterCity === c.city
                          ? 'border-[#f4991a] bg-orange-50 shadow-sm'
                          : 'border-gray-100 bg-gray-50/60 hover:bg-gray-50 hover:border-gray-200'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1a1c3a] truncate">{c.city}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">
                          {c.delivered > 0 && <span className="text-sky-600">{c.delivered} deliv · </span>}
                          {c.shipped > 0 && <span className="text-blue-600">{c.shipped} ship · </span>}
                          {c.pending > 0 && <span className="text-emerald-600">{c.pending} pend</span>}
                          {c.delivered === 0 && c.shipped === 0 && c.pending === 0 && <span>—</span>}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[#f4991a] flex-shrink-0 ml-2">{c.total}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Dates</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
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
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onTogglePrint}
            className="text-gray-300 hover:text-blue-600 transition-colors"
            title={(order.print_count || 0) > 0 ? 'Re-print' : 'Add to print queue'}
          >
            {inPrintQueue ? <CheckSquare size={15} className="text-blue-600" /> : <Square size={15} />}
          </button>
          {(order.print_count || 0) > 0 && (
            <span className="inline-block text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              {order.print_count}×
            </span>
          )}
        </div>
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
        <span className="text-xs font-bold text-[#1a1c3a]">
          {(order.total_amount || 0) > 0 ? `KES ${order.total_amount.toLocaleString()}` : '—'}
          {order.original_total && order.original_total !== order.total_amount && order.original_total > 0 && (
            <span className="text-[9px] text-gray-400 line-through ml-1">KES {order.original_total.toLocaleString()}</span>
          )}
        </span>
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

      {/* Dates */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="flex flex-col gap-0.5 text-[10px] leading-tight">
          <span className="text-gray-500"><span className="text-gray-300">Order:</span> {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
          {order.last_call_at && (
            <span className="text-emerald-600"><span className="text-gray-300">Conf:</span> {new Date(order.last_call_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
          )}
          {order.shipped_to_agent_at && (
            <span className="text-purple-600"><span className="text-gray-300">Agent:</span> {new Date(order.shipped_to_agent_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
          )}
          {order.shipped_at && (
            <span className="text-blue-600"><span className="text-gray-300">Ship:</span> {new Date(order.shipped_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
          )}
          {order.delivered_at && (
            <span className="text-sky-600"><span className="text-gray-300">Deliv:</span> {new Date(order.delivered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
          )}
          {order.returned_at && (
            <span className="text-red-600"><span className="text-gray-300">Ret:</span> {new Date(order.returned_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
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
            href={whatsappLink(order.customer_phone, `Hello 👋 ${order.customer_name}, your order *${order.tracking_number}* for ${(Array.isArray(order.items) ? order.items : []).map((it: any) => { const q = Number(it.quantity) || 1; return q > 1 ? `${it.name || 'Item'} (x${q})` : (it.name || 'Item') }).join(', ')} is on its way 🚚. Please confirm your availability for delivery.`)}
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
