'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Truck, CheckCircle, RotateCcw, Package, Phone, MessageCircle, X,
  ChevronDown, ChevronUp, Clock, RefreshCw, FileText, Calendar, UserCheck,
  MapPin, User, LogOut, Banknote, Send, StickyNote,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getFollowup, clearUser } from '@/lib/auth'
import { getCountry } from '@/lib/countries'
import { findUsiriAgent } from '@/lib/usiriAgents'
import { TZ_CITIES, resolveTzCity } from '@/lib/tanzaniaCities'
import { supabase } from '@/lib/supabase'

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
  last_call_note?: string | null
  shipped_to_agent_at?: string | null
  delivered_at?: string | null
  returned_at?: string | null
  paid_by_agent_at?: string | null
  created_at: string
  delivery_tracking?: string | null
  country?: string
}

type FollowupNote = {
  id: string
  order_id: string
  agent_id: string
  agent_name: string
  note: string
  created_at: string
}

const statusConfig: Record<string, { label: string; color: string; border: string; dot: string }> = {
  shipped_to_agent:   { label: 'Sent to Agent',      color: 'text-purple-600', border: 'border-purple-400', dot: 'bg-purple-500' },
  delivered_by_agent: { label: 'Delivered by Agent', color: 'text-teal-600',   border: 'border-teal-400',   dot: 'bg-teal-500'   },
  paid_by_agent:      { label: 'Paid by Agent',      color: 'text-cyan-600',   border: 'border-cyan-400',   dot: 'bg-cyan-500'   },
  returned:           { label: 'Returned',           color: 'text-red-600',    border: 'border-red-400',    dot: 'bg-red-500'    },
}
const FOLLOWUP_STATUSES = ['shipped_to_agent', 'delivered_by_agent', 'paid_by_agent', 'returned']

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

function getDateRange(preset: DatePreset, customFrom: string, customTo: string): { from: Date | null; to: Date | null } {
  const now = new Date()
  const sod = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c }
  const eod = (d: Date) => { const c = new Date(d); c.setHours(23, 59, 59, 999); return c }
  switch (preset) {
    case 'today': return { from: sod(now), to: eod(now) }
    case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: sod(y), to: eod(y) } }
    case 'this_week': { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return { from: sod(d), to: eod(now) } }
    case 'this_month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: eod(now) }
    case 'last_month': return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: eod(new Date(now.getFullYear(), now.getMonth(), 0)) }
    case 'custom': return {
      from: customFrom ? new Date(customFrom + 'T00:00:00') : null,
      to: customTo ? new Date(customTo + 'T23:59:59.999') : null,
    }
    default: return { from: null, to: null }
  }
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function cleanPhone(p: string) {
  return (p || '').replace(/[^\d+]/g, '')
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export default function FollowupPage() {
  const router = useRouter()
  const [user, setUserState] = useState<any>(null)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [notesByOrder, setNotesByOrder] = useState<Record<string, FollowupNote[]>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [search, setSearch] = useState('')
  const [filterProduct, setFilterProduct] = useState('all')
  const [filterCity, setFilterCity] = useState('all')
  const [citiesExpanded, setCitiesExpanded] = useState(false)
  const [groupByCity, setGroupByCity] = useState(false)

  const [openNotes, setOpenNotes] = useState<string | null>(null)
  const [noteText, setNoteText] = useState<Record<string, string>>({})
  const [savingNote, setSavingNote] = useState<string | null>(null)

  useEffect(() => {
    const u = getFollowup()
    if (!u) { router.push('/login'); return }
    setUserState(u)
  }, [router])

  const fetchOrders = useCallback(async () => {
    if (!user) return
    setRefreshing(true)
    try {
      const res = await fetch('/api/followup/orders', {
        headers: { 'x-agent-id': user.id, 'x-agent-name': user.name || '' },
        cache: 'no-store',
      })
      const data = await res.json()
      setOrders(data.orders || [])
      setNotesByOrder(data.notes || {})
    } catch (e) {
      console.error('Failed to fetch orders:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('followup-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'followup_notes' }, () => fetchOrders())
      .subscribe()
    const interval = setInterval(fetchOrders, 30000)
    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [user, fetchOrders])

  const changeStatus = async (orderId: string, newStatus: string) => {
    setProcessing(orderId)
    try {
      const res = await fetch('/api/orders/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus }),
      })
      const data = await res.json()
      if (data.ok) {
        const nowIso = new Date().toISOString()
        setOrders(prev => prev.map(o => o.id === orderId ? {
          ...o,
          status: newStatus,
          ...(newStatus === 'delivered_by_agent' ? { delivered_at: nowIso } : {}),
          ...(newStatus === 'paid_by_agent' ? { paid_by_agent_at: nowIso } : {}),
          ...(newStatus === 'returned' ? { returned_at: nowIso } : {}),
        } : o))
      } else {
        alert(data.error || 'Failed to change status')
      }
    } catch (e) {
      console.error('Status change failed:', e)
    } finally {
      setProcessing(null)
    }
  }

  const addNote = async (orderId: string) => {
    const text = noteText[orderId]?.trim()
    if (!text || !user) return
    setSavingNote(orderId)
    try {
      const res = await fetch('/api/followup/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-id': user.id, 'x-agent-name': user.name || '' },
        body: JSON.stringify({ action: 'add_note', orderId, note: text }),
      })
      const data = await res.json()
      if (data.ok && data.note) {
        setNotesByOrder(prev => ({ ...prev, [orderId]: [data.note, ...(prev[orderId] || [])] }))
        setNoteText(prev => ({ ...prev, [orderId]: '' }))
      }
    } finally {
      setSavingNote(null)
    }
  }

  const productOptions = useMemo(() => {
    const set = new Set<string>()
    orders.forEach(o => (Array.isArray(o.items) ? o.items : []).forEach((it: any) => it?.name && set.add(it.name)))
    return Array.from(set).sort()
  }, [orders])

  // Normalize messy city values to the canonical region city (TZ only)
  const cityOf = useCallback((o: OrderRow) => {
    if ((user?.country || 'TZ') === 'TZ') return resolveTzCity(o.customer_city, o.customer_address) || 'Other'
    return o.customer_city || '—'
  }, [user?.country])

  const cityOptions = useMemo(() => {
    const set = new Set<string>()
    orders.forEach(o => set.add(cityOf(o)))
    const idx = (c: string) => { const i = TZ_CITIES.indexOf(c); return i === -1 ? 999 : i }
    return Array.from(set).sort((a, b) => idx(a) - idx(b) || a.localeCompare(b))
  }, [orders, cityOf])

  // Everything except the status filter — drives the stat cards so counts are real
  const baseFiltered = useMemo(() => {
    const { from, to } = getDateRange(datePreset, customFrom, customTo)
    const q = search.trim().toLowerCase()
    return orders.filter(o => {
      if (from || to) {
        const t = new Date(o.shipped_to_agent_at || o.created_at).getTime()
        if (from && t < from.getTime()) return false
        if (to && t > to.getTime()) return false
      }
      if (filterCity !== 'all' && cityOf(o) !== filterCity) return false
      if (filterProduct !== 'all' && !(Array.isArray(o.items) ? o.items : []).some((it: any) => it?.name === filterProduct)) return false
      if (q) {
        const hay = `${o.tracking_number} ${o.delivery_tracking || ''} ${o.customer_name} ${o.customer_phone} ${o.customer_city} ${o.customer_address}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [orders, datePreset, customFrom, customTo, search, filterCity, filterProduct, cityOf])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    baseFiltered.forEach(o => { c[o.status] = (c[o.status] || 0) + 1 })
    return c
  }, [baseFiltered])

  const filtered = useMemo(() => {
    const list = filterStatus === 'all' ? baseFiltered : baseFiltered.filter(o => o.status === filterStatus)
    return [...list].sort((a, b) =>
      new Date(b.shipped_to_agent_at || b.created_at).getTime() - new Date(a.shipped_to_agent_at || a.created_at).getTime())
  }, [baseFiltered, filterStatus])

  const cityBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; sent: number; delivered: number; paid: number; returned: number; amount: number }>()
    filtered.forEach(o => {
      const c = cityOf(o)
      const cur = map.get(c) || { total: 0, sent: 0, delivered: 0, paid: 0, returned: 0, amount: 0 }
      cur.total++
      if (o.status === 'shipped_to_agent') cur.sent++
      if (o.status === 'delivered_by_agent') cur.delivered++
      if (o.status === 'paid_by_agent') cur.paid++
      if (o.status === 'returned') cur.returned++
      cur.amount += o.total_amount || 0
      map.set(c, cur)
    })
    return Array.from(map.entries()).map(([city, s]) => ({ city, ...s })).sort((a, b) => b.total - a.total)
  }, [filtered, cityOf])

  const groupedByCity = useMemo(() => {
    if (!groupByCity) return null
    const map = new Map<string, OrderRow[]>()
    filtered.forEach(o => {
      const c = cityOf(o)
      map.set(c, [...(map.get(c) || []), o])
    })
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [filtered, groupByCity, cityOf])

  if (!user) return null

  const country = getCountry(user.country || 'TZ')
  const cs = country.currencySymbol
  const totalAmount = filtered.reduce((s, o) => s + (o.total_amount || 0), 0)
  const hasFilters = filterProduct !== 'all' || filterCity !== 'all' || !!search || filterStatus !== 'all'

  const renderOrderCard = (order: OrderRow) => {
    const cfg = statusConfig[order.status] || statusConfig.shipped_to_agent
    const notes = notesByOrder[order.id] || []
    const days = order.status === 'shipped_to_agent' ? daysSince(order.shipped_to_agent_at || order.created_at) : null
    const usiri = country.code === 'TZ' && order.status === 'shipped_to_agent' ? findUsiriAgent(order.customer_city) : null
    const notesOpen = openNotes === order.id
    const items = Array.isArray(order.items) ? order.items : []

    return (
      <div key={order.id} className={cn('bg-white rounded-lg border shadow-sm', cfg.border)}>
        <div className="px-3 py-2 flex items-center justify-between border-b border-gray-50 bg-gray-50/40">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="text-[11px] font-mono font-bold text-[#1a1c3a]">{order.tracking_number}</span>
            {order.delivery_tracking && (
              <span className="text-[9px] font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded">{order.delivery_tracking}</span>
            )}
            <span className="text-[9px] text-gray-400">{order.payment_method}</span>
            {(order.total_amount || 0) > 0 && (
              <span className="text-[11px] font-bold text-[#f4991a]">{cs} {order.total_amount.toLocaleString()}</span>
            )}
            {days !== null && (
              <span className={cn(
                'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded',
                days <= 2 ? 'text-emerald-600 bg-emerald-50' : days <= 5 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
              )}>
                <Clock size={9} /> {days === 0 ? 'today' : `${days}d`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <a href={`tel:${cleanPhone(order.customer_phone)}`}
              className="w-6 h-6 rounded-md bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500">
              <Phone size={11} />
            </a>
            <a href={`https://wa.me/${cleanPhone(order.customer_phone).replace(/^\+/, '')}`} target="_blank" rel="noreferrer"
              className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600">
              <MessageCircle size={11} />
            </a>
            <StatusDropdown
              currentStatus={order.status}
              processing={processing === order.id}
              onChangeStatus={s => s !== order.status && changeStatus(order.id, s)}
            />
          </div>
        </div>

        <div className="px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[12px] font-semibold text-[#1a1c3a]">{order.customer_name}</p>
            <span className="text-[11px] text-gray-400">{order.customer_phone}</span>
            <span className="text-[11px] font-medium text-gray-500">{order.customer_city}</span>
            {order.customer_address && <span className="text-[10px] text-gray-300">{order.customer_address}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 flex-wrap">
            <Package size={10} className="text-gray-300 flex-shrink-0" />
            {items.map((it: any, i: number) => (
              <span key={i} className="font-medium">{it.name || 'Item'} x{it.quantity || 1}{i < items.length - 1 ? ' · ' : ''}</span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">
              <Calendar size={9} /> Order: {shortDate(order.created_at)}
            </span>
            {order.shipped_to_agent_at && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                <UserCheck size={9} /> To Agent: {shortDate(order.shipped_to_agent_at)}
              </span>
            )}
            {order.delivered_at && (order.status === 'delivered_by_agent' || order.status === 'paid_by_agent') && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-600 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5">
                <CheckCircle size={9} /> Delivered: {shortDate(order.delivered_at)}
              </span>
            )}
            {order.paid_by_agent_at && order.status === 'paid_by_agent' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-600 bg-cyan-50 border border-cyan-200 rounded px-1.5 py-0.5">
                <Banknote size={9} /> Paid: {shortDate(order.paid_by_agent_at)}
              </span>
            )}
            {order.returned_at && order.status === 'returned' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                <RotateCcw size={9} /> Returned: {shortDate(order.returned_at)}
              </span>
            )}
          </div>

          {usiri && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded px-2 py-1.5">
              <User size={10} className="text-indigo-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-indigo-700">{usiri.name}</span>
                <span className="text-[9px] text-indigo-400 ml-1.5">{usiri.region}</span>
                {usiri.office && <span className="text-[9px] text-indigo-300 ml-1">· {usiri.office}</span>}
              </div>
            </div>
          )}

          {order.last_call_note && (
            <div className="flex items-start gap-1 text-[11px] text-blue-600 bg-blue-50 rounded px-2 py-1">
              <Phone size={9} className="mt-0.5 flex-shrink-0" />
              <span>{order.last_call_note}</span>
            </div>
          )}
          {order.notes && (
            <div className="flex items-start gap-1 text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1">
              <FileText size={9} className="mt-0.5 flex-shrink-0" />
              <span>{order.notes}</span>
            </div>
          )}

          {!notesOpen && notes.map(n => (
            <div key={n.id} className="flex items-start gap-1 text-[11px] text-purple-700 bg-purple-50 rounded px-2 py-1">
              <StickyNote size={9} className="mt-0.5 flex-shrink-0" />
              <span className="font-semibold">{n.agent_name}:</span>
              <span className="flex-1">{n.note}</span>
              <span className="text-[9px] text-purple-300 flex-shrink-0">
                {new Date(n.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          <button
            onClick={() => setOpenNotes(notesOpen ? null : order.id)}
            className="flex items-center gap-1 text-[10px] font-bold text-gray-300 hover:text-purple-600"
          >
            <FileText size={9} />
            {notesOpen ? 'Hide notes' : notes.length > 0 ? `Notes (${notes.length})` : 'Add note'}
          </button>

          {notesOpen && (
            <div className="bg-purple-50/40 border border-purple-100 rounded-lg p-2 space-y-1.5">
              <div className="flex gap-1.5">
                <input
                  value={noteText[order.id] || ''}
                  onChange={e => setNoteText(prev => ({ ...prev, [order.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addNote(order.id) }}
                  placeholder="Write a note (everyone will see it)..."
                  autoFocus
                  className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded text-[11px] focus:outline-none focus:border-purple-400"
                />
                <button
                  onClick={() => addNote(order.id)}
                  disabled={!noteText[order.id]?.trim() || savingNote === order.id}
                  className="px-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded"
                >
                  {savingNote === order.id ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                </button>
              </div>
              {notes.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic">No notes yet</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {notes.map(n => (
                    <div key={n.id} className="bg-white border border-purple-100 rounded px-2 py-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-600">{n.agent_name}</span>
                        <span className="text-[9px] text-gray-400">
                          {new Date(n.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-700">{n.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-[#1a1c3a] text-lg flex items-center gap-2"><Truck size={18} /> Follow-up · {country.flag} {country.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{user.name} · {orders.length} orders sent to agent</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#f4991a] hover:text-orange-600"
          >
            <RefreshCw size={12} className={cn(refreshing && 'animate-spin')} /> Refresh
          </button>
          <button
            onClick={() => { clearUser('followup'); router.push('/login') }}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-500"
          >
            <LogOut size={12} /> Logout
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FOLLOWUP_STATUSES.map(s => {
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
              onClick={() => setDatePreset(dp.value)}
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

        {/* Filters row */}
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
          {hasFilters && (
            <button
              onClick={() => { setFilterProduct('all'); setFilterCity('all'); setSearch(''); setFilterStatus('all') }}
              className="px-3 py-2.5 text-xs font-semibold text-gray-500 hover:text-[#f4991a] flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>
          )}
          <span className="ml-auto text-xs text-gray-500">
            <span className="font-bold text-[#1a1c3a]">{filtered.length}</span> orders ·{' '}
            <span className="font-bold text-[#f4991a]">{cs} {totalAmount.toLocaleString()}</span>
          </span>
        </div>

        {/* Cities breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setCitiesExpanded(v => !v)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
              <MapPin size={14} className="text-[#f4991a]" />
              <span className="text-sm font-bold text-[#1a1c3a]">Cities in {country.name}</span>
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {cityBreakdown.length} towns · {filtered.length} orders
              </span>
              {citiesExpanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
            </button>
            <button
              onClick={() => setGroupByCity(v => !v)}
              className={cn(
                'text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1',
                groupByCity
                  ? 'bg-[#f4991a] text-white border-[#f4991a]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-[#f4991a] hover:text-[#f4991a]'
              )}
            >
              <MapPin size={10} /> {groupByCity ? 'Grouped by City ✓' : 'Group by City'}
            </button>
          </div>
          {citiesExpanded && (
            <div className="px-4 pb-4 pt-1 max-h-[400px] overflow-y-auto">
              {cityBreakdown.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No cities in current filter</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {cityBreakdown.map(c => {
                    const usiri = country.code === 'TZ' ? findUsiriAgent(c.city) : null
                    return (
                      <button
                        key={c.city}
                        onClick={() => setFilterCity(filterCity === c.city ? 'all' : c.city)}
                        className={cn(
                          'px-3 py-2.5 rounded-lg border text-left transition-all',
                          filterCity === c.city ? 'border-[#f4991a] bg-orange-50 shadow-sm' : 'border-gray-100 bg-gray-50/60 hover:bg-gray-50 hover:border-gray-200'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] font-bold text-[#1a1c3a] truncate">{c.city}</p>
                          <span className="text-sm font-bold text-[#f4991a] flex-shrink-0 ml-2">{c.total}</span>
                        </div>
                        {usiri && <p className="text-[9px] text-indigo-500 font-semibold mb-1 truncate">{usiri.name}</p>}
                        <div className="flex items-center gap-1.5 text-[9px] flex-wrap">
                          {c.sent > 0 && <span className="text-purple-600 font-semibold">{c.sent} sent</span>}
                          {c.delivered > 0 && <span className="text-teal-600 font-semibold">{c.delivered} deliv</span>}
                          {c.paid > 0 && <span className="text-cyan-600 font-semibold">{c.paid} paid</span>}
                          {c.returned > 0 && <span className="text-red-500 font-semibold">{c.returned} ret</span>}
                        </div>
                        <div className="text-[9px] text-gray-400 mt-0.5">{cs} {c.amount.toLocaleString()}</div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Orders list */}
        <div className="space-y-1">
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-sm text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
              <Truck size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders found</p>
            </div>
          ) : groupedByCity ? groupedByCity.map(([city, cityOrders]) => {
            const usiriAgent = country.code === 'TZ' ? findUsiriAgent(city) : null
            const cityAmount = cityOrders.reduce((s, o) => s + (o.total_amount || 0), 0)
            return (
              <div key={city} className="space-y-1 mb-4">
                <div className="sticky top-0 z-10 bg-gradient-to-r from-[#1a1c3a] to-[#2a2c4a] rounded-lg px-4 py-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-[#f4991a]" />
                      <span className="text-sm font-bold text-white">{city}</span>
                      <span className="text-[10px] font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded-full">{cityOrders.length} orders</span>
                    </div>
                    <span className="text-[10px] text-[#f4991a] font-bold">{cs} {cityAmount.toLocaleString()}</span>
                  </div>
                  {usiriAgent && (
                    <div className="mt-1.5 flex items-center gap-2 bg-white/10 rounded px-2.5 py-1.5">
                      <User size={10} className="text-indigo-300" />
                      <span className="text-[10px] font-bold text-white">{usiriAgent.name}</span>
                    </div>
                  )}
                </div>
                {cityOrders.map(renderOrderCard)}
              </div>
            )
          }) : filtered.map(renderOrderCard)}
        </div>
      </div>
    </div>
  )
}

function StatusDropdown({ currentStatus, processing, onChangeStatus }: {
  currentStatus: string
  processing: boolean
  onChangeStatus: (s: string) => void
}) {
  const [open, setOpen] = useState(false)
  const cfg = statusConfig[currentStatus] || statusConfig.shipped_to_agent

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={processing}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-full border-2 text-[11px] font-semibold transition-all bg-white',
          cfg.color, cfg.border, processing && 'opacity-50'
        )}
      >
        {processing ? '...' : cfg.label}
        <ChevronDown size={10} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 min-w-[170px]">
            {FOLLOWUP_STATUSES.map(s => {
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
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', c.dot)} />
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
