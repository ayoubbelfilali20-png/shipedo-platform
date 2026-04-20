'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { incrementStockForOrderItems } from '@/lib/stock'
import { printOrderLabels, type PrintLabelProps } from '@/components/PrintLabel'
import {
  Search, Truck, CheckCircle, RotateCcw, Package, Phone,
  MessageCircle, X, ChevronDown, ChevronUp, Printer, CheckSquare, Square,
  Clock, AlertCircle, PhoneOff, Pencil, Save, XCircle,
  RefreshCw, FileText, Calendar, UserCheck, MapPin,
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
  last_call_note?: string | null
  shipped_at?: string | null
  shipped_to_agent_at?: string | null
  delivered_at?: string | null
  returned_at?: string | null
  last_call_at?: string | null
  created_at: string
  seller_id?: string | null
  call_attempts?: number
  reminded_at?: string | null
  cancel_reason?: string | null
}

type AllStatus = 'pending' | 'confirmed' | 'prepared' | 'shipped_to_agent' | 'shipped' | 'delivered' | 'returned' | 'cancelled'

const statusConfig: Record<string, { label: string; color: string; border: string; bg: string }> = {
  pending:          { label: 'Pending',          color: 'text-rose-600',    border: 'border-rose-400',    bg: 'bg-rose-50'    },
  confirmed:        { label: 'Confirmed',        color: 'text-emerald-600', border: 'border-emerald-400', bg: 'bg-emerald-50' },
  prepared:         { label: 'Prepared',         color: 'text-indigo-600',  border: 'border-indigo-400',  bg: 'bg-indigo-50'  },
  shipped_to_agent: { label: 'Shipped to Agent', color: 'text-purple-600',  border: 'border-purple-400',  bg: 'bg-purple-50'  },
  shipped:          { label: 'Shipped',          color: 'text-blue-600',    border: 'border-blue-400',    bg: 'bg-blue-50'    },
  delivered:        { label: 'Delivered',        color: 'text-sky-600',     border: 'border-sky-400',     bg: 'bg-sky-50'     },
  returned:         { label: 'Returned',         color: 'text-red-600',     border: 'border-red-400',     bg: 'bg-red-50'     },
  cancelled:        { label: 'Cancelled',        color: 'text-gray-500',    border: 'border-gray-300',    bg: 'bg-gray-50'    },
}

const shippingStatuses: AllStatus[] = ['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'returned']
const allStatuses: AllStatus[] = ['pending', 'confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'returned', 'cancelled']

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

/** Get the date when the order moved to its current status */
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
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}

async function logWhatsAppContact(orderId: string, agentId: string, agentName: string, customerName: string) {
  try {
    await supabase.from('call_logs').insert({
      order_id: orderId,
      agent_id: agentId,
      agent_name: agentName,
      action: 'whatsapp_contact',
      note: `WhatsApp message sent to ${customerName}`,
    })
  } catch {}
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
  const [filterStatus, setFilterStatus] = useState<AllStatus | 'all'>('all')
  const [filterProduct, setFilterProduct] = useState<string>('all')
  const [filterCity, setFilterCity] = useState<string>('all')
  const [citiesExpanded, setCitiesExpanded] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editNoteId, setEditNoteId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Print queue
  const [printQueue, setPrintQueue] = useState<Set<string>>(new Set())

  // Agent info for logging
  const [agentId, setAgentId] = useState<string>('')
  const [agentName, setAgentName] = useState<string>('')

  useEffect(() => {
    try {
      const u = localStorage.getItem('shipedo_agent')
      if (u) {
        const parsed = JSON.parse(u)
        setAgentId(parsed.id || '')
        setAgentName(parsed.name || '')
      }
    } catch {}
  }, [])

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, printed, print_count, notes, last_call_note, shipped_at, shipped_to_agent_at, delivered_at, returned_at, last_call_at, created_at, seller_id, call_attempts, reminded_at, cancel_reason')
      .in('status', ['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'returned'])
      .order('created_at', { ascending: false })
      .limit(2000)
    const rows = (data || []) as OrderRow[]
    // Recalculate total from items if total_amount is 0
    rows.forEach(o => {
      if ((!o.total_amount || o.total_amount === 0) && Array.isArray(o.items)) {
        const calc = o.items.reduce((s: number, it: any) => s + (Number(it.unit_price || it.price || 0) * (Number(it.quantity) || 1)), 0)
        if (calc > 0) o.total_amount = calc
      }
    })
    setOrders(rows)
    setLoading(false)
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  // Real-time subscription — auto-update when seller or anyone edits orders
  useEffect(() => {
    const channel = supabase
      .channel('agent-shipping-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as OrderRow
          if (['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'returned'].includes(row.status)) {
            setOrders(prev => [row, ...prev])
          }
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as OrderRow
          setOrders(prev => {
            const validStatus = ['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'returned'].includes(row.status)
            const exists = prev.some(o => o.id === row.id)
            if (exists && validStatus) return prev.map(o => o.id === row.id ? row : o)
            if (exists && !validStatus) return prev.filter(o => o.id !== row.id)
            if (!exists && validStatus) return [row, ...prev]
            return prev
          })
        } else if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => o.id !== (payload.old as any).id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Resolve city once per order — used by every filter/breakdown computation
  const cityByOrderId = useMemo(() => {
    const m = new Map<string, string | null>()
    orders.forEach(o => m.set(o.id, resolveCity(o.customer_city, o.customer_address)))
    return m
  }, [orders])

  const productOptions = useMemo(() => {
    const set = new Map<string, string>()
    orders.forEach(o => {
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

  // Pre-compute date range once so we don't reparse per row
  const { from: dateFrom, to: dateTo } = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  )

  const baseFiltered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const productLower = filterProduct.toLowerCase()
    return orders.filter(o => {
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
    const acc = {} as Record<string, number>
    shippingStatuses.forEach(s => { acc[s] = 0 })
    baseFiltered.forEach(o => { if (acc[o.status] !== undefined) acc[o.status]++ })
    return acc
  }, [baseFiltered])

  // City breakdown (uses base filter — respects date, product, search; ignores city/status)
  const cityBreakdown = useMemo(() => {
    const q = search.toLowerCase().trim()
    const productLower = filterProduct.toLowerCase()
    const map = new Map<string, { total: number; delivered: number; shipped: number; pending: number }>()
    orders.forEach(o => {
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

  const changeStatus = async (orderId: string, newStatus: string) => {
    setProcessing(orderId)
    const patch: any = { status: newStatus }

    if (newStatus === 'shipped_to_agent') patch.shipped_to_agent_at = new Date().toISOString()
    if (newStatus === 'shipped') patch.shipped_at = new Date().toISOString()
    if (newStatus === 'delivered') patch.delivered_at = new Date().toISOString()
    if (newStatus === 'returned') {
      patch.returned_at = new Date().toISOString()
      const order = orders.find(o => o.id === orderId)
      if (order) await incrementStockForOrderItems(order.items)
    }
    // Reset timestamps when going back
    if (newStatus === 'confirmed' || newStatus === 'prepared') {
      patch.shipped_to_agent_at = null
      patch.shipped_at = null
      patch.delivered_at = null
      patch.returned_at = null
    }
    if (newStatus === 'pending') {
      patch.shipped_to_agent_at = null
      patch.shipped_at = null
      patch.delivered_at = null
      patch.returned_at = null
    }

    await supabase.from('orders').update(patch).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o))
    setProcessing(null)
  }

  // Edit client info
  const startEdit = (order: OrderRow) => {
    setEditingId(order.id)
    setEditName(order.customer_name)
    setEditPhone(order.customer_phone)
    setEditCity(order.customer_city)
    setEditAddress(order.customer_address || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSavingEdit(true)
    const patch = {
      customer_name: editName.trim(),
      customer_phone: editPhone.trim(),
      customer_city: editCity.trim(),
      customer_address: editAddress.trim(),
    }
    await supabase.from('orders').update(patch).eq('id', editingId)
    setOrders(prev => prev.map(o => o.id === editingId ? { ...o, ...patch } : o))
    setSavingEdit(false)
    setEditingId(null)
  }

  const startEditNote = (order: OrderRow) => {
    setEditNoteId(order.id)
    setEditNote(order.notes || '')
  }
  const saveNote = async () => {
    if (!editNoteId) return
    setSavingNote(true)
    await supabase.from('orders').update({ notes: editNote.trim() || null }).eq('id', editNoteId)
    setOrders(prev => prev.map(o => o.id === editNoteId ? { ...o, notes: editNote.trim() || null } : o))
    setSavingNote(false)
    setEditNoteId(null)
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
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-[#1a1c3a] text-lg flex items-center gap-2"><Truck size={18} /> Shipping</h1>
          <p className="text-xs text-gray-400 mt-0.5">{orders.length} delivery orders &middot; Follow up & manage</p>
        </div>
        <button
          onClick={() => { setLoading(true); loadOrders() }}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#f4991a] hover:text-orange-600"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {shippingStatuses.map(s => {
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
                <p className={cn('text-lg font-bold', cfg.color)}>{counts[s] || 0}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{cfg.label}</p>
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setCitiesExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
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
            <div className="px-4 pb-4 pt-1 max-h-[360px] overflow-y-auto">
              {cityBreakdown.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No cities in current filter</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {cityBreakdown.map(c => (
                    <button
                      key={c.city}
                      onClick={() => setFilterCity(filterCity === c.city ? 'all' : c.city)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all',
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

        {/* Orders list */}
        <div className="space-y-1.5">
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-sm text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
              <Truck size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders found</p>
            </div>
          ) : filtered.map(order => {
            const cfg = statusConfig[order.status] || statusConfig.confirmed
            const isEditing = editingId === order.id
            return (
              <div key={order.id} className={cn('bg-white rounded-xl border shadow-sm', cfg.border)}>
                {/* Header */}
                <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-50 bg-gray-50/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => togglePrintQueue(order.id)}
                      className="text-gray-300 hover:text-blue-600"
                      title={(order.print_count || 0) > 0 ? 'Re-print' : 'Add to print queue'}
                    >
                      {printQueue.has(order.id) ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} />}
                    </button>
                    {(order.print_count || 0) > 0 && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        {order.print_count}× Printed
                      </span>
                    )}
                    <span className="text-xs font-mono font-bold text-[#1a1c3a]">{order.tracking_number}</span>
                    <span className="text-[10px] text-gray-400">{order.payment_method}</span>
                    {(order.total_amount || 0) > 0 && (
                      <span className="text-xs font-bold text-[#f4991a]">
                        KES {order.total_amount.toLocaleString()}
                        {order.original_total && order.original_total !== order.total_amount && order.original_total > 0 && (
                          <span className="text-[9px] text-gray-400 line-through ml-1">KES {order.original_total.toLocaleString()}</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a href={`tel:${cleanPhone(order.customer_phone)}`}
                      className="w-7 h-7 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500 transition-all">
                      <Phone size={12} />
                    </a>
                    <a href={whatsappLink(order.customer_phone, `Hello 👋 ${order.customer_name}, your order *${order.tracking_number}* for ${(Array.isArray(order.items) ? order.items : []).map((it: any) => { const q = Number(it.quantity) || 1; return q > 1 ? `${it.name || 'Item'} (x${q})` : (it.name || 'Item') }).join(', ')} is on its way 🚚. Please confirm your availability for delivery.`)}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => logWhatsAppContact(order.id, agentId, agentName, order.customer_name)}
                      className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-all">
                      <MessageCircle size={12} />
                    </a>
                    <StatusDropdown
                      currentStatus={order.status as AllStatus}
                      processing={processing === order.id}
                      onChangeStatus={(s) => changeStatus(order.id, s)}
                    />
                  </div>
                </div>

                {/* Body */}
                <div className="px-4 py-2.5 space-y-2">
                  {isEditing ? (
                    <div className="space-y-2 bg-orange-50/50 border border-orange-200 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name"
                          className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-orange-400" />
                        <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone"
                          className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-orange-400" />
                        <input value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="City"
                          className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-orange-400" />
                        <input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Address"
                          className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-orange-400" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={saveEdit} disabled={savingEdit}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all">
                          {savingEdit ? '...' : 'Save'}
                        </button>
                        <button onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold rounded-lg transition-all">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#1a1c3a]">{order.customer_name}</p>
                      <span className="text-xs text-gray-400">{order.customer_phone}</span>
                      <span className="text-xs text-gray-400">{order.customer_city}</span>
                      {order.customer_address && <span className="text-xs text-gray-300">{order.customer_address}</span>}
                      <button onClick={() => startEdit(order)}
                        className="w-5 h-5 rounded flex items-center justify-center text-gray-300 hover:text-[#f4991a] flex-shrink-0">
                        <Pencil size={10} />
                      </button>
                    </div>
                  )}

                  {/* Items inline */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                    <Package size={12} className="text-gray-300 flex-shrink-0" />
                    {(Array.isArray(order.items) ? order.items : []).map((it: any, i: number) => (
                      <span key={i} className="font-medium">{it.name || 'Item'} x{it.quantity || 1}{i < order.items.length - 1 ? ' · ' : ''}</span>
                    ))}
                  </div>

                  {/* Order lifecycle dates */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {order.created_at && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5">
                        <Calendar size={11} /> Order: {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {order.last_call_at && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5">
                        <CheckCircle size={11} /> Confirmed: {new Date(order.last_call_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {order.shipped_to_agent_at && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg px-2 py-0.5">
                        <UserCheck size={11} /> To Agent: {new Date(order.shipped_to_agent_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {order.shipped_at && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-2 py-0.5">
                        <Truck size={11} /> Shipped: {new Date(order.shipped_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {order.delivered_at && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 bg-sky-50 border border-sky-200 rounded-lg px-2 py-0.5">
                        <CheckCircle size={11} /> Delivered: {new Date(order.delivered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {order.returned_at && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-0.5">
                        <RotateCcw size={11} /> Returned: {new Date(order.returned_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {/* Call note */}
                  {order.last_call_note && (
                    <div className="flex items-start gap-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg px-2.5 py-1.5">
                      <Phone size={11} className="mt-0.5 flex-shrink-0" />
                      <span><strong>Call note:</strong> {order.last_call_note}</span>
                    </div>
                  )}

                  {/* Order note */}
                  {editNoteId === order.id ? (
                    <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-2.5 space-y-1.5">
                      <textarea value={editNote} onChange={e => setEditNote(e.target.value)}
                        placeholder="Add a note..." rows={2}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 resize-none" />
                      <div className="flex items-center gap-1.5">
                        <button onClick={saveNote} disabled={savingNote}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg">
                          {savingNote ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditNoteId(null)}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold rounded-lg">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {order.notes && (
                        <div className="flex-1 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                          <FileText size={11} className="mt-0.5 flex-shrink-0" />
                          <span>{order.notes}</span>
                        </div>
                      )}
                      <button onClick={() => startEditNote(order)}
                        className="text-xs font-bold text-gray-300 hover:text-amber-600 flex-shrink-0 px-1">
                        {order.notes ? <Pencil size={10} /> : <span className="flex items-center gap-1"><FileText size={11} /> Add note</span>}
                      </button>
                    </div>
                  )}
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
  currentStatus: AllStatus
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
                    'bg-rose-500':    s === 'pending',
                    'bg-emerald-500': s === 'confirmed',
                    'bg-indigo-500':  s === 'prepared',
                    'bg-purple-500':  s === 'shipped_to_agent',
                    'bg-blue-500':    s === 'shipped',
                    'bg-sky-500':     s === 'delivered',
                    'bg-red-500':     s === 'returned',
                    'bg-gray-400':    s === 'cancelled',
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
