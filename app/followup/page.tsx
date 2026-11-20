'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Package, Phone, X, ChevronDown, ChevronUp,
  RefreshCw, MapPin, User, MessageSquarePlus, Clock, Send,
  CheckCircle2, RotateCcw, Banknote, LogOut, StickyNote, Filter,
  Truck, AlertTriangle, Calendar, PackageCheck,
} from 'lucide-react'
import { getFollowup, clearUser } from '@/lib/auth'
import { getCountry } from '@/lib/countries'
import { findUsiriAgent, type UsiriAgent } from '@/lib/usiriAgents'

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
  last_call_note?: string | null
  shipped_at?: string | null
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

const statusConfig: Record<string, { label: string; color: string; border: string; bg: string; dot: string }> = {
  shipped_to_agent:   { label: 'Sent to Agent',       color: 'text-purple-600',  border: 'border-purple-400',  bg: 'bg-purple-50',  dot: 'bg-purple-500'  },
  delivered_by_agent: { label: 'Delivered by Agent',   color: 'text-teal-600',    border: 'border-teal-400',    bg: 'bg-teal-50',    dot: 'bg-teal-500'    },
  paid_by_agent:      { label: 'Paid by Agent',        color: 'text-cyan-600',    border: 'border-cyan-400',    bg: 'bg-cyan-50',    dot: 'bg-cyan-500'    },
  returned:           { label: 'Returned',             color: 'text-red-600',     border: 'border-red-400',     bg: 'bg-red-50',     dot: 'bg-red-500'     },
}

const ALL_FOLLOWUP_STATUSES = ['shipped_to_agent', 'delivered_by_agent', 'paid_by_agent', 'returned'] as const

function daysSince(iso?: string | null): number | null {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  return Math.floor(diff / 86400000)
}

function daysLabel(days: number | null): string {
  if (days === null) return ''
  if (days === 0) return 'today'
  if (days === 1) return '1 day'
  return `${days} days`
}

function daysColor(days: number | null): string {
  if (days === null) return 'text-gray-400'
  if (days <= 2) return 'text-green-600'
  if (days <= 5) return 'text-amber-600'
  return 'text-red-600'
}

export default function FollowupPage() {
  const router = useRouter()
  const [user, setUserState] = useState<any>(null)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [notesByOrder, setNotesByOrder] = useState<Record<string, FollowupNote[]>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<string>('shipped_to_agent')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [noteText, setNoteText] = useState<Record<string, string>>({})
  const [savingNote, setSavingNote] = useState<string | null>(null)
  const [changingStatus, setChangingStatus] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Date filter
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateFilter, setShowDateFilter] = useState(false)

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

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setChangingStatus(orderId)
    try {
      const res = await fetch('/api/orders/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus }),
      })
      const data = await res.json()
      if (data.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      }
    } catch (e) {
      console.error('Status change failed:', e)
    } finally {
      setChangingStatus(null)
    }
  }

  const handleAddNote = async (orderId: string) => {
    const text = noteText[orderId]?.trim()
    if (!text || !user) return
    setSavingNote(orderId)
    try {
      const res = await fetch('/api/followup/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-id': user.id,
          'x-agent-name': user.name || '',
        },
        body: JSON.stringify({ action: 'add_note', orderId, note: text }),
      })
      const data = await res.json()
      if (data.ok && data.note) {
        setNotesByOrder(prev => ({
          ...prev,
          [orderId]: [data.note, ...(prev[orderId] || [])],
        }))
        setNoteText(prev => ({ ...prev, [orderId]: '' }))
      }
    } catch (e) {
      console.error('Failed to add note:', e)
    } finally {
      setSavingNote(null)
    }
  }

  const filtered = useMemo(() => {
    let list = orders
    if (activeTab !== 'all') {
      list = list.filter(o => o.status === activeTab)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.tracking_number?.toLowerCase().includes(q) ||
        o.customer_city?.toLowerCase().includes(q)
      )
    }
    // Date filter
    if (dateFrom) {
      const from = new Date(dateFrom + 'T00:00:00').getTime()
      list = list.filter(o => {
        const d = new Date(o.shipped_to_agent_at || o.created_at).getTime()
        return d >= from
      })
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59').getTime()
      list = list.filter(o => {
        const d = new Date(o.shipped_to_agent_at || o.created_at).getTime()
        return d <= to
      })
    }
    return list
  }, [orders, activeTab, search, dateFrom, dateTo])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1
    return c
  }, [orders])

  const totalAmount = useMemo(() => {
    return filtered.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  }, [filtered])

  const handleLogout = () => {
    clearUser('followup')
    router.push('/login')
  }

  const clearDateFilter = () => {
    setDateFrom('')
    setDateTo('')
  }

  if (!user) return null

  const country = getCountry(user.country || 'TZ')
  const cs = country.currencySymbol

  const fmtDate = (iso?: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const fmtNoteDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const getOrderDays = (order: OrderRow): number | null => {
    return daysSince(order.shipped_to_agent_at || order.created_at)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Truck size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Follow-up Dashboard</h1>
              <p className="text-[10px] text-gray-400">{user.name} · {country.flag}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDateFilter(!showDateFilter)} className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${(dateFrom || dateTo) ? 'bg-purple-50' : ''}`}>
              <Calendar size={16} className={`${(dateFrom || dateTo) ? 'text-purple-500' : 'text-gray-500'}`} />
            </button>
            <button onClick={fetchOrders} disabled={refreshing} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <RefreshCw size={16} className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <LogOut size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-1.5">
          {ALL_FOLLOWUP_STATUSES.map(s => {
            const cfg = statusConfig[s]
            return (
              <button
                key={s}
                onClick={() => setActiveTab(activeTab === s ? 'all' : s)}
                className={`rounded-xl p-2.5 text-center transition-all border ${
                  activeTab === s ? `${cfg.bg} ${cfg.border} ring-1 ring-offset-1` : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className={`text-lg font-bold ${cfg.color}`}>{counts[s] || 0}</div>
                <div className="text-[8px] text-gray-500 font-medium mt-0.5 leading-tight">{cfg.label}</div>
              </button>
            )
          })}
        </div>

        {/* Date filter */}
        {showDateFilter && (
          <div className="bg-white rounded-xl border border-purple-200 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Filter by Date</span>
              {(dateFrom || dateTo) && (
                <button onClick={clearDateFilter} className="text-[10px] text-purple-500 font-medium hover:underline">Clear</button>
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] text-gray-400 mb-1">From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-gray-400 mb-1">To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400" />
              </div>
            </div>
          </div>
        )}

        {/* Summary bar */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {filtered.length} orders
            {(dateFrom || dateTo) && <span className="text-purple-500 ml-1">(filtered)</span>}
          </span>
          <span className="text-xs font-semibold text-gray-700">{cs} {totalAmount.toLocaleString()}</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, tracking..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="animate-spin text-purple-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">No orders found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(order => {
              const cfg = statusConfig[order.status] || statusConfig.shipped_to_agent
              const isExpanded = expandedOrder === order.id
              const notes = notesByOrder[order.id] || []
              const usiriAgent = order.country === 'TZ' ? findUsiriAgent(order.customer_city) : null
              const items = Array.isArray(order.items) ? order.items : []
              const productNames = items.map((it: any) => it.product_name || it.name || '?').join(', ')
              const days = getOrderDays(order)

              return (
                <div key={order.id} className={`bg-white rounded-xl border ${cfg.border} overflow-hidden transition-all`}>
                  {/* Card header */}
                  <button
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="w-full px-3.5 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">{order.tracking_number}</span>
                          {/* Days counter */}
                          {days !== null && (
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${daysColor(days)}`}>
                              <Clock size={9} />
                              {daysLabel(days)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-900 truncate">{order.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1"><MapPin size={10} />{order.customer_city}</span>
                          <span className="flex items-center gap-1"><Phone size={10} />{order.customer_phone}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-gray-900">{cs} {(order.total_amount || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{fmtDate(order.shipped_to_agent_at || order.created_at)}</div>
                        {notes.length > 0 && (
                          <div className="flex items-center gap-1 justify-end mt-1">
                            <StickyNote size={10} className="text-amber-500" />
                            <span className="text-[10px] text-amber-600 font-medium">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Usiri agent info for TZ */}
                    {usiriAgent && order.status === 'shipped_to_agent' && (
                      <div className="mt-2 flex items-center gap-2 px-2 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                        <User size={12} className="text-indigo-500 flex-shrink-0" />
                        <span className="text-[10px] text-indigo-700 font-medium truncate">
                          {usiriAgent.name} · {usiriAgent.region} · {usiriAgent.phone}
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-3.5 py-3 space-y-3">
                      {/* Product info */}
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Products:</span> {productNames || '—'}
                      </div>

                      {/* Address */}
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Address:</span> {order.customer_address || '—'}
                      </div>

                      {/* Call notes from agent */}
                      {order.last_call_note && (
                        <div className="text-xs bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                          <span className="font-medium text-amber-700">Agent note:</span>
                          <span className="text-amber-800 ml-1">{order.last_call_note}</span>
                        </div>
                      )}

                      {/* Usiri agent full info */}
                      {usiriAgent && (
                        <div className="bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-100">
                          <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-1">Usiri Agent</div>
                          <div className="text-xs text-indigo-800 space-y-0.5">
                            <div><span className="font-medium">Name:</span> {usiriAgent.name}</div>
                            <div><span className="font-medium">Region:</span> {usiriAgent.region}</div>
                            <div><span className="font-medium">Phone:</span> <a href={`tel:${usiriAgent.phone}`} className="underline">{usiriAgent.phone}</a></div>
                            <div><span className="font-medium">Office:</span> {usiriAgent.office}</div>
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Timeline</div>
                        {order.created_at && <div className="text-[11px] text-gray-600"><span className="text-gray-400 w-28 inline-block">Created:</span> {fmtDate(order.created_at)}</div>}
                        {order.shipped_to_agent_at && <div className="text-[11px] text-gray-600"><span className="text-gray-400 w-28 inline-block">Sent to agent:</span> {fmtDate(order.shipped_to_agent_at)}</div>}
                        {order.delivered_at && <div className="text-[11px] text-gray-600"><span className="text-gray-400 w-28 inline-block">Delivered:</span> {fmtDate(order.delivered_at)}</div>}
                        {order.paid_by_agent_at && <div className="text-[11px] text-gray-600"><span className="text-gray-400 w-28 inline-block">Paid:</span> {fmtDate(order.paid_by_agent_at)}</div>}
                        {order.returned_at && <div className="text-[11px] text-red-600"><span className="text-gray-400 w-28 inline-block">Returned:</span> {fmtDate(order.returned_at)}</div>}
                      </div>

                      {/* Status actions */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Change Status</div>
                        <div className="flex gap-2">
                          {order.status === 'shipped_to_agent' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(order.id, 'delivered_by_agent')}
                                disabled={changingStatus === order.id}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 size={13} /> Delivered
                              </button>
                              <button
                                onClick={() => handleStatusChange(order.id, 'returned')}
                                disabled={changingStatus === order.id}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                <RotateCcw size={13} /> Returned
                              </button>
                            </>
                          )}
                          {order.status === 'delivered_by_agent' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(order.id, 'paid_by_agent')}
                                disabled={changingStatus === order.id}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                <Banknote size={13} /> Paid by Agent
                              </button>
                              <button
                                onClick={() => handleStatusChange(order.id, 'returned')}
                                disabled={changingStatus === order.id}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                <RotateCcw size={13} /> Returned
                              </button>
                            </>
                          )}
                          {order.status === 'paid_by_agent' && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-lg text-xs text-cyan-700 w-full">
                              <Banknote size={13} /> Agent has paid — completed
                            </div>
                          )}
                          {order.status === 'returned' && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 w-full">
                              <AlertTriangle size={13} /> Order returned
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notes section */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Follow-up Notes</div>

                        {/* Add note form */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add a note..."
                            value={noteText[order.id] || ''}
                            onChange={e => setNoteText(prev => ({ ...prev, [order.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddNote(order.id) }}
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                          />
                          <button
                            onClick={() => handleAddNote(order.id)}
                            disabled={!noteText[order.id]?.trim() || savingNote === order.id}
                            className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            {savingNote === order.id ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <Send size={13} />
                            )}
                          </button>
                        </div>

                        {/* Notes list */}
                        {notes.length > 0 && (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {notes.map(n => (
                              <div key={n.id} className="bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[10px] font-semibold text-purple-600">{n.agent_name}</span>
                                  <span className="text-[9px] text-purple-400">{fmtNoteDate(n.created_at)}</span>
                                </div>
                                <p className="text-xs text-gray-700">{n.note}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {notes.length === 0 && (
                          <p className="text-[11px] text-gray-400 italic">No notes yet</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
