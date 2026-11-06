'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { incrementStockForOrderItems } from '@/lib/stock'
import { printOrderLabels, type PrintLabelProps } from '@/components/PrintLabel'
import {
  Search, Truck, CheckCircle, RotateCcw, Package, Phone,
  MessageCircle, X, ChevronDown, ChevronUp, Printer, CheckSquare, Square,
  Clock, AlertCircle, PhoneOff, Pencil, Save, XCircle,
  RefreshCw, FileText, Calendar, UserCheck, MapPin, Download, Sheet,
} from 'lucide-react'
import { exportOrdersExcel } from '@/lib/exportExcel'
import { cn } from '@/lib/utils'
import { detectDuplicates } from '@/lib/detectDuplicates'
import { getCountry } from '@/lib/countries'
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
  country?: string
  last_call_at?: string | null
  created_at: string
  seller_id?: string | null
  call_attempts?: number
  reminded_at?: string | null
  cancel_reason?: string | null
  status_changed_at?: string | null
}

type AllStatus = 'pending' | 'confirmed' | 'prepared' | 'shipped_to_agent' | 'shipped' | 'delivered' | 'delivered_by_agent' | 'returned' | 'cancelled'

const statusConfig: Record<string, { label: string; color: string; border: string; bg: string; dot: string }> = {
  pending:              { label: 'Pending',          color: 'text-rose-600',    border: 'border-rose-400',    bg: 'bg-rose-50',    dot: 'bg-rose-500'    },
  confirmed:            { label: 'Confirmed',        color: 'text-emerald-600', border: 'border-emerald-400', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  prepared:             { label: 'Prepared',         color: 'text-indigo-600',  border: 'border-indigo-400',  bg: 'bg-indigo-50',  dot: 'bg-indigo-500'  },
  shipped_to_agent:     { label: 'Sent to Agent',    color: 'text-purple-600',  border: 'border-purple-400',  bg: 'bg-purple-50',  dot: 'bg-purple-500'  },
  shipped:              { label: 'Shipped',          color: 'text-blue-600',    border: 'border-blue-400',    bg: 'bg-blue-50',    dot: 'bg-blue-500'    },
  delivered:            { label: 'Delivered',        color: 'text-sky-600',     border: 'border-sky-400',     bg: 'bg-sky-50',     dot: 'bg-sky-500'     },
  delivered_by_agent:   { label: 'Delivered by Agent', color: 'text-teal-600',  border: 'border-teal-400',    bg: 'bg-teal-50',    dot: 'bg-teal-500'    },
  returned:             { label: 'Returned',         color: 'text-red-600',     border: 'border-red-400',     bg: 'bg-red-50',     dot: 'bg-red-500'     },
  cancelled:            { label: 'Cancelled',        color: 'text-gray-500',    border: 'border-gray-300',    bg: 'bg-gray-50',    dot: 'bg-gray-400'    },
}

const shippingStatuses: AllStatus[] = ['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'delivered_by_agent', 'returned']
const allStatuses: AllStatus[] = ['pending', 'confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'delivered_by_agent', 'returned', 'cancelled']

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
  if (o.status_changed_at) return o.status_changed_at
  if ((o.status === 'delivered' || o.status === 'delivered_by_agent') && o.delivered_at) return o.delivered_at
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
async function sendWaMsg(phone: string, text: string, orderId: string, agentId: string, agentName: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, text, orderId, agentId, agentName }),
    })
    return await res.json()
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error' }
  }
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
    country: o.country,
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
  const [waSendStatus, setWaSendStatus] = useState<Record<string, 'sending' | 'sent' | 'failed'>>({})
  const [datePreset, setDatePreset] = useState<DatePreset>('today')
  const [trackingModal, setTrackingModal] = useState<{ orderId: string; newStatus: string } | null>(null)
  const [deliveryTrackingInput, setDeliveryTrackingInput] = useState('')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [fullDataLoaded, setFullDataLoaded] = useState(false)

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
  const [agentCountry, setAgentCountry] = useState('KE')

  // Expanded row for detail view
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Google Sheet export
  const [sheetStatus, setSheetStatus] = useState<'idle' | 'copied'>('idle')

  useEffect(() => {
    try {
      const u = localStorage.getItem('shipedo_agent')
      if (u) {
        const parsed = JSON.parse(u)
        setAgentId(parsed.id || '')
        setAgentName(parsed.name || '')
        if (parsed.country) setAgentCountry(parsed.country)
      }
    } catch {}
  }, [])

  const loadOrders = useCallback(async (loadAll = false) => {
    if (!agentId) return
    const res = await fetch(`/api/agent/shipping${loadAll ? '?all=1' : ''}`, {
      cache: 'no-store',
      headers: { 'x-agent-id': agentId },
    })
    const { orders: data } = await res.json()
    const rows = (data || []) as OrderRow[]
    rows.forEach(o => {
      if ((!o.total_amount || o.total_amount === 0) && Array.isArray(o.items)) {
        const calc = o.items.reduce((s: number, it: any) => s + (Number(it.unit_price || it.price || 0) * (Number(it.quantity) || 1)), 0)
        if (calc > 0) o.total_amount = calc
      }
    })
    setOrders(rows)
    setLoading(false)
    if (loadAll) setFullDataLoaded(true)
  }, [agentId])

  useEffect(() => { if (agentId) loadOrders() }, [agentId, loadOrders])

  useEffect(() => {
    if (!fullDataLoaded && (datePreset === 'all' || datePreset === 'last_month')) {
      setLoading(true)
      loadOrders(true)
    }
  }, [datePreset])

  // Auto-refresh every 30s so all users see the same data
  useEffect(() => {
    if (!agentId) return
    const interval = setInterval(() => {
      loadOrders(fullDataLoaded)
    }, 120000)
    return () => clearInterval(interval)
  }, [agentId, loadOrders, fullDataLoaded])

  // Real-time subscription — only update existing orders
  useEffect(() => {
    const channel = supabase
      .channel('agent-shipping-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as OrderRow
          if (['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'delivered_by_agent', 'returned'].includes(row.status)) {
            setOrders(prev => {
              if (prev.some(o => o.id === row.id)) return prev
              return [row, ...prev]
            })
          }
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as OrderRow
          setOrders(prev => {
            const validStatus = ['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'delivered_by_agent', 'returned'].includes(row.status)
            const exists = prev.some(o => o.id === row.id)
            if (exists && validStatus) return prev.map(o => o.id === row.id ? { ...o, ...row } : o)
            if (exists && !validStatus) return prev.filter(o => o.id !== row.id)
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
    const colors = /\s*(BLACK|WHITE|BLUE|RED|GREY|GRAY|GOLD|NAVY BLUE|NAVY|GREEN|PINK|SILVER|PURPLE|YELLOW|RED AND BLACK|RED AND WHITE|,\s*(BLACK|WHITE|BLUE|RED|GREY|GOLD))\s*$/i
    orders.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : []
      items.forEach((it: any) => {
        const raw = (it.name || '').trim()
        if (!raw) return
        const base = raw.replace(colors, '').trim() || raw
        set.set(base.toLowerCase(), base)
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
        ((o as any).delivery_tracking || '').toLowerCase().includes(q) ||
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
        const colorsRe = /\s*(BLACK|WHITE|BLUE|RED|GREY|GRAY|GOLD|NAVY BLUE|NAVY|GREEN|PINK|SILVER|PURPLE|YELLOW|RED AND BLACK|RED AND WHITE|,\s*(BLACK|WHITE|BLUE|RED|GREY|GOLD))\s*$/i
        if (!o.items.some((it: any) => (it.name || '').replace(colorsRe, '').trim().toLowerCase() === productLower)) return false
      }
      if (filterCity !== 'all' && cityByOrderId.get(o.id) !== filterCity) return false
      return true
    })
  }, [orders, search, dateFrom, dateTo, filterProduct, filterCity, cityByOrderId])

  const duplicateMap = useMemo(() => detectDuplicates(orders), [orders])

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
        ((o as any).delivery_tracking || '').toLowerCase().includes(q) ||
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
        const colorsRe2 = /\s*(BLACK|WHITE|BLUE|RED|GREY|GRAY|GOLD|NAVY BLUE|NAVY|GREEN|PINK|SILVER|PURPLE|YELLOW|RED AND BLACK|RED AND WHITE|,\s*(BLACK|WHITE|BLUE|RED|GREY|GOLD))\s*$/i
        if (!o.items.some((it: any) => (it.name || '').replace(colorsRe2, '').trim().toLowerCase() === productLower)) return
      }
      const c = cityByOrderId.get(o.id)
      if (!c) return
      const cur = map.get(c) || { total: 0, delivered: 0, shipped: 0, pending: 0 }
      cur.total++
      if (o.status === 'delivered' || o.status === 'delivered_by_agent') cur.delivered++
      if (o.status === 'shipped' || o.status === 'shipped_to_agent') cur.shipped++
      if (o.status === 'confirmed' || o.status === 'prepared') cur.pending++
      map.set(c, cur)
    })
    return Array.from(map.entries())
      .map(([city, stats]) => ({ city, ...stats }))
      .sort((a, b) => b.total - a.total)
  }, [orders, search, dateFrom, dateTo, filterProduct, cityByOrderId])

  const changeStatus = async (orderId: string, newStatus: string, deliveryTracking?: string) => {
    if ((newStatus === 'shipped_to_agent' || newStatus === 'shipped') && deliveryTracking === undefined) {
      const order = orders.find(o => o.id === orderId)
      setDeliveryTrackingInput((order as any)?.delivery_tracking || '')
      setTrackingModal({ orderId, newStatus })
      return
    }

    setProcessing(orderId)

    if (newStatus === 'returned') {
      const order = orders.find(o => o.id === orderId)
      if (order) await incrementStockForOrderItems(order.items, order.country || 'KE')
    }

    const existing = orders.find(o => o.id === orderId)
    const res = await fetch('/api/orders/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        newStatus,
        deliveryTracking,
        preserveShippedToAgent: newStatus === 'shipped_to_agent' && !!(existing as any)?.shipped_to_agent_at,
      }),
    })
    const result = await res.json()
    if (result.ok && result.patch) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...result.patch } : o))
    }
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
  const exportExcel = () => exportOrdersExcel(filtered, agentCountry)

  const sendToSheet = () => {
    if (filtered.length === 0) return
    const rows = filtered.map(o => {
      const items = Array.isArray(o.items) ? o.items : []
      const products = items.map((it: any) => {
        const q = Number(it.quantity) || 1
        return q > 1 ? `${it.name || 'Item'} x${q}` : (it.name || 'Item')
      }).join(', ')
      const shippedDate = o.shipped_to_agent_at || o.shipped_at
      return [
        (o as any).delivery_tracking || o.tracking_number || '',
        shippedDate ? new Date(shippedDate).toLocaleDateString('en-GB') : '',
        o.customer_name,
        o.customer_phone,
        o.customer_city,
        products,
        String(o.total_amount || 0),
      ].join('\t')
    })
    const tsv = rows.join('\n')
    navigator.clipboard.writeText(tsv)
    setSheetStatus('copied')
    setTimeout(() => setSheetStatus('idle'), 3000)
    window.open('https://sheets.new', '_blank')
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

          <button
            onClick={exportExcel}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all"
          >
            <Download size={13} /> Export Excel
          </button>

          <button
            onClick={sendToSheet}
            disabled={filtered.length === 0}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-all',
              sheetStatus === 'copied'
                ? 'bg-emerald-500 text-white'
                : 'bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white'
            )}
          >
            <Sheet size={13} />
            {sheetStatus === 'copied' ? 'Copied! Paste in Sheet' : 'Google Sheet'}
          </button>

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
              <span className="text-sm font-bold text-[#1a1c3a]">Cities</span>
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

        {/* Orders table (sheet view) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Truck size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left">
                    <th className="px-2 py-2.5 w-8">
                      <Square size={12} className="text-gray-300" />
                    </th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Tracking</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Client</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Phone</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">City</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Products</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px] text-right">Amount</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Status</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Date</th>
                    <th className="px-2 py-2.5 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order, idx) => {
                    const cfg = statusConfig[order.status] || statusConfig.confirmed
                    const isEditing = editingId === order.id
                    const items = Array.isArray(order.items) ? order.items : []
                    const productNames = items.map((it: any) => {
                      const q = Number(it.quantity) || 1
                      return q > 1 ? `${it.name || 'Item'} x${q}` : (it.name || 'Item')
                    }).join(', ')
                    const shippedDate = order.shipped_to_agent_at || order.shipped_at || order.created_at
                    const dup = duplicateMap.get(order.id)
                    return (
                      <tr key={order.id} className={cn(
                        'border-b border-gray-100 hover:bg-gray-50/60 transition-colors',
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30',
                        expandedRow === order.id && 'bg-orange-50/30'
                      )}>
                        <td className="px-2 py-2">
                          <button onClick={() => togglePrintQueue(order.id)} className="text-gray-300 hover:text-blue-600">
                            {printQueue.has(order.id) ? <CheckSquare size={13} className="text-blue-600" /> : <Square size={13} />}
                          </button>
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => setExpandedRow(expandedRow === order.id ? null : order.id)}
                            className="text-left group">
                            <span className="font-mono font-bold text-[#1a1c3a] group-hover:text-[#f4991a]">{order.tracking_number}</span>
                            {(order as any).delivery_tracking && (
                              <span className="block text-[9px] font-mono text-blue-500">{(order as any).delivery_tracking}</span>
                            )}
                          </button>
                          {dup?.isDuplicate && <span className="ml-1 text-[8px] font-bold text-red-600 bg-red-50 px-1 rounded">DUP</span>}
                          {dup?.isSameClient && !dup?.isDuplicate && <span className="ml-1 text-[8px] font-bold text-amber-600 bg-amber-50 px-1 rounded">SAME</span>}
                        </td>
                        <td className="px-2 py-2">
                          {isEditing ? (
                            <input value={editName} onChange={e => setEditName(e.target.value)}
                              className="px-1.5 py-1 bg-white border border-orange-300 rounded text-xs w-28 focus:outline-none" />
                          ) : (
                            <span className="font-semibold text-[#1a1c3a]">{order.customer_name}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {isEditing ? (
                            <input value={editPhone} onChange={e => setEditPhone(e.target.value)}
                              className="px-1.5 py-1 bg-white border border-orange-300 rounded text-xs w-24 focus:outline-none" />
                          ) : (
                            <span className="text-gray-600">{order.customer_phone}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {isEditing ? (
                            <input value={editCity} onChange={e => setEditCity(e.target.value)}
                              className="px-1.5 py-1 bg-white border border-orange-300 rounded text-xs w-24 focus:outline-none" />
                          ) : (
                            <span className="font-medium text-gray-700">{order.customer_city}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 max-w-[200px]">
                          <span className="text-gray-600 truncate block">{productNames}</span>
                        </td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">
                          <span className="font-bold text-[#f4991a]">
                            {getCountry(agentCountry).currencySymbol} {(order.total_amount || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <StatusDropdown
                            currentStatus={order.status as AllStatus}
                            processing={processing === order.id}
                            onChangeStatus={(s) => changeStatus(order.id, s)}
                          />
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-gray-400">
                          {new Date(shippedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <a href={`tel:${cleanPhone(order.customer_phone)}`}
                              className="w-6 h-6 rounded-md bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500">
                              <Phone size={11} />
                            </a>
                            <button
                              disabled={waSendStatus[order.id] === 'sending'}
                              onClick={async () => {
                                setWaSendStatus(p => ({ ...p, [order.id]: 'sending' }))
                                const msg = `Hello ${order.customer_name}, your order *${order.tracking_number}* for ${items.map((it: any) => { const q = Number(it.quantity) || 1; return q > 1 ? `${it.name || 'Item'} (x${q})` : (it.name || 'Item') }).join(', ')} is on its way. Please confirm your availability for delivery.`
                                const result = await sendWaMsg(order.customer_phone, msg, order.id, agentId, agentName)
                                setWaSendStatus(p => ({ ...p, [order.id]: result.ok ? 'sent' : 'failed' }))
                                if (result.ok) logWhatsAppContact(order.id, agentId, agentName, order.customer_name)
                                setTimeout(() => setWaSendStatus(p => { const n = { ...p }; delete n[order.id]; return n }), 2500)
                              }}
                              className={cn(
                                "w-6 h-6 rounded-md flex items-center justify-center transition-all",
                                waSendStatus[order.id] === 'sent' ? 'bg-emerald-500 text-white' :
                                waSendStatus[order.id] === 'failed' ? 'bg-red-100 text-red-500' :
                                waSendStatus[order.id] === 'sending' ? 'bg-emerald-100 text-emerald-400 animate-pulse' :
                                'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                              )}
                              title="Send WhatsApp">
                              <MessageCircle size={11} />
                            </button>
                            <button onClick={() => isEditing ? saveEdit() : startEdit(order)}
                              disabled={isEditing && savingEdit}
                              className={cn(
                                "w-6 h-6 rounded-md flex items-center justify-center transition-all",
                                isEditing ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-[#f4991a]'
                              )}>
                              {isEditing ? (savingEdit ? <Clock size={11} /> : <Save size={11} />) : <Pencil size={11} />}
                            </button>
                            {isEditing && (
                              <button onClick={cancelEdit}
                                className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* Expanded row detail */}
          {expandedRow && (() => {
            const order = filtered.find(o => o.id === expandedRow)
            if (!order) return null
            return (
              <div className="border-t-2 border-[#f4991a] bg-orange-50/30 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1a1c3a]">{order.tracking_number} — {order.customer_name}</span>
                  <button onClick={() => setExpandedRow(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
                {order.customer_address && <p className="text-xs text-gray-500">Address: {order.customer_address}</p>}
                <div className="flex items-center gap-2 flex-wrap">
                  {order.created_at && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                      <Calendar size={10} /> {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {order.shipped_to_agent_at && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                      <UserCheck size={10} /> To Agent: {new Date(order.shipped_to_agent_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  {order.delivered_at && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5">
                      <CheckCircle size={10} /> Delivered: {new Date(order.delivered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  {order.returned_at && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                      <RotateCcw size={10} /> Returned: {new Date(order.returned_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  {(order.print_count || 0) > 0 && (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">{order.print_count}x Printed</span>
                  )}
                </div>
                {order.last_call_note && (
                  <div className="flex items-start gap-1.5 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1.5">
                    <Phone size={10} className="mt-0.5 flex-shrink-0" /> <span>Call note: {order.last_call_note}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  {editNoteId === order.id ? (
                    <div className="flex-1 flex items-center gap-1.5">
                      <input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Note..."
                        className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-amber-400" />
                      <button onClick={saveNote} disabled={savingNote}
                        className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded">{savingNote ? '...' : 'Save'}</button>
                      <button onClick={() => setEditNoteId(null)}
                        className="px-2 py-1 bg-gray-200 text-gray-600 text-[10px] font-bold rounded">Cancel</button>
                    </div>
                  ) : (
                    <>
                      {order.notes && (
                        <div className="flex-1 flex items-start gap-1 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                          <FileText size={10} className="mt-0.5 flex-shrink-0" /> <span>{order.notes}</span>
                        </div>
                      )}
                      <button onClick={() => startEditNote(order)}
                        className="text-[10px] font-bold text-gray-400 hover:text-amber-600 flex items-center gap-1">
                        <FileText size={10} /> {order.notes ? 'Edit' : 'Add note'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })()}
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
        {/* Delivery tracking modal */}
        {trackingModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-[#1a1c3a]">Delivery Tracking Number</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Enter the delivery company tracking number (optional)</p>
              </div>
              <div className="p-5">
                <input value={deliveryTrackingInput} onChange={e => setDeliveryTrackingInput(e.target.value)}
                  placeholder="e.g. SPX-KE-123456789" autoFocus
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                <button onClick={() => { setTrackingModal(null); setDeliveryTrackingInput('') }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-500 text-sm font-bold rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={() => {
                  const { orderId, newStatus } = trackingModal
                  setTrackingModal(null)
                  changeStatus(orderId, newStatus, deliveryTrackingInput.trim() || '')
                  setDeliveryTrackingInput('')
                }} className="flex-1 py-2.5 bg-[#1a1c3a] hover:bg-[#2a2c4a] text-white text-sm font-bold rounded-xl">
                  {deliveryTrackingInput.trim() ? 'Save & Update' : 'Skip & Update'}
                </button>
              </div>
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
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig[s]?.dot || 'bg-gray-400')} />
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
