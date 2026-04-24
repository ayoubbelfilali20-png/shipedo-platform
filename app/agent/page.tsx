'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Phone, CheckCircle, XCircle, Package, Truck, TrendingUp,
  Clock, DollarSign, ArrowRight, Search, Calendar, RotateCcw,
  AlertCircle, User, MapPin, Send, Check, X, MessageCircle
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'
import { cn } from '@/lib/utils'
import { detectDuplicates } from '@/lib/detectDuplicates'

type OrderRow = {
  id: string
  tracking_number: string
  customer_name: string
  customer_phone: string
  customer_city: string
  items: any[]
  total_amount: number
  original_total?: number | null
  status: string
  payment_status?: string | null
  notes?: string | null
  call_attempts?: number | null
  reminded_at?: string | null
  last_call_at?: string | null
  last_call_agent_id?: string | null
  created_at: string
}

type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'all' | 'custom'

type CallLog = {
  id: string
  order_id: string
  agent_name: string | null
  action: string
  note: string | null
  reminded_at: string | null
  created_at: string
}

const statusFlow: Record<string, { next?: string; label: string; color: string }> = {
  pending:          { next: 'confirmed',       label: 'Confirm',        color: 'bg-emerald-500 hover:bg-emerald-600' },
  confirmed:        { next: 'prepared',        label: 'Prepare',        color: 'bg-indigo-500 hover:bg-indigo-600'   },
  prepared:         { next: 'shipped_to_agent', label: 'Send to Agent', color: 'bg-purple-500 hover:bg-purple-600'   },
  shipped_to_agent: { next: 'shipped',         label: 'Ship',           color: 'bg-blue-500 hover:bg-blue-600'       },
  shipped:          { next: 'delivered',       label: 'Deliver',        color: 'bg-sky-500 hover:bg-sky-600'         },
  delivered:        { next: undefined,         label: '—',              color: '' },
}

const statusColors: Record<string, string> = {
  pending:          'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  prepared:         'bg-indigo-50 text-indigo-700 border-indigo-200',
  shipped_to_agent: 'bg-purple-50 text-purple-700 border-purple-200',
  shipped:          'bg-blue-50 text-blue-700 border-blue-200',
  delivered:        'bg-sky-50 text-sky-700 border-sky-200',
  cancelled:        'bg-gray-100 text-gray-500 border-gray-200',
  returned:         'bg-red-50 text-red-700 border-red-200',
}

const statusLabels: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', prepared: 'Prepared',
  shipped_to_agent: 'Sent to Agent', shipped: 'Shipped',
  delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned',
}

function getRange(period: Period, customFrom: string, customTo: string): { from: Date | null; to: Date | null } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (period === 'today') {
    const end = new Date(today); end.setDate(end.getDate() + 1)
    return { from: today, to: end }
  }
  if (period === 'yesterday') {
    const start = new Date(today); start.setDate(start.getDate() - 1)
    return { from: start, to: today }
  }
  if (period === 'this_week') {
    const start = new Date(today)
    const dow = (start.getDay() + 6) % 7 // Monday = 0
    start.setDate(start.getDate() - dow)
    const end = new Date(start); end.setDate(end.getDate() + 7)
    return { from: start, to: end }
  }
  if (period === 'last_week') {
    const start = new Date(today)
    const dow = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - dow - 7)
    const end = new Date(start); end.setDate(end.getDate() + 7)
    return { from: start, to: end }
  }
  if (period === 'this_month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    return { from: start, to: end }
  }
  if (period === 'custom') {
    return {
      from: customFrom ? new Date(customFrom) : null,
      to: customTo ? new Date(new Date(customTo).getTime() + 24 * 60 * 60 * 1000) : null,
    }
  }
  return { from: null, to: null }
}

const periodLabels: Record<Period, string> = {
  today:      'Today',
  yesterday:  'Yesterday',
  this_week:  'This week',
  last_week:  'Last week',
  this_month: 'This month',
  all:        'All time',
  custom:     'Custom',
}

export default function AgentDashboard() {
  const router = useRouter()
  const [agentId, setAgentId]   = useState<string | null>(null)
  const [agentName, setAgentName] = useState<string>('Agent')
  const [orders, setOrders]     = useState<OrderRow[]>([])
  const [pending, setPending]   = useState<OrderRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [period, setPeriod]     = useState<Period>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [busyId, setBusyId]     = useState<string | null>(null)
  const [recallOrder, setRecallOrder] = useState<OrderRow | null>(null)
  const [historyOrder, setHistoryOrder] = useState<OrderRow | null>(null)
  const [historyLogs, setHistoryLogs] = useState<CallLog[]>([])

  const CACHE_KEY = 'shipedo_agent_orders_v1'
  const [fullDataLoaded, setFullDataLoaded] = useState(false)

  const load = async (aid: string | null, days?: number) => {
    if (!aid) { setLoading(false); return }

    if (!days) {
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const { pending: cp, orders: co } = JSON.parse(cached)
          if (cp) setPending(cp)
          if (co) setOrders(co)
          setLoading(false)
        }
      } catch {}
    }

    const url = days ? `/api/agent/dashboard?days=${days}` : '/api/agent/dashboard'
    const res = await fetch(url, { headers: { 'x-agent-id': aid } })
    const { pending: pen = [], orders: ord = [] } = await res.json()

    const freshPending = pen as OrderRow[]
    const freshOrders  = ord as OrderRow[]
    setPending(freshPending)
    setOrders(freshOrders)
    setLoading(false)
    if (days && days >= 365) setFullDataLoaded(true)

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ pending: freshPending, orders: freshOrders }))
    } catch {}
  }

  useEffect(() => {
    let aid: string | null = null
    try {
      const u = localStorage.getItem('shipedo_agent')
      if (u) {
        const parsed = JSON.parse(u)
        if (parsed.role === 'agent') {
          aid = parsed.id
          setAgentName(parsed.name || 'Agent')
        }
      }
    } catch {}
    setAgentId(aid)
    load(aid)
  }, [])

  useEffect(() => {
    if (fullDataLoaded || !agentId) return
    const needsDays: Record<string, number> = {
      last_week: 14, this_month: 31, all: 365, custom: 365,
    }
    const days = needsDays[period]
    if (days) {
      setLoading(true)
      load(agentId, days)
    }
  }, [period])

  const filteredByPeriod = useMemo(() => {
    if (period === 'all') return orders
    const { from, to } = getRange(period, customFrom, customTo)
    if (!from && !to) return orders
    return orders.filter(o => {
      const ref = new Date(o.last_call_at || o.created_at)
      if (from && ref < from) return false
      if (to && ref >= to) return false
      return true
    })
  }, [orders, period, customFrom, customTo])

  const stats = useMemo(() => {
    const f = filteredByPeriod
    const isDone = (s: string) => ['confirmed','prepared','shipped_to_agent','shipped','delivered'].includes(s)
    return {
      toCall:          pending.length,
      total:           f.length,
      confirmed:       f.filter(o => o.status === 'confirmed').length,
      prepared:        f.filter(o => o.status === 'prepared').length,
      shipped_to_agent: f.filter(o => o.status === 'shipped_to_agent').length,
      shipped:         f.filter(o => o.status === 'shipped').length,
      delivered:       f.filter(o => o.status === 'delivered').length,
      cancelled:       f.filter(o => o.status === 'cancelled').length,
      paid:            f.filter(o => o.payment_status === 'paid').length,
      done:            f.filter(o => isDone(o.status)).length,
      revenue:         f.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total_amount || 0), 0),
    }
  }, [filteredByPeriod, pending])

  const confirmRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
  const deliveryRate = stats.done > 0 ? Math.round((stats.delivered / stats.done) * 100) : 0

  const trend = useMemo(() => {
    const days: { day: string; confirmed: number; delivered: number }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const next = new Date(d)
      next.setDate(d.getDate() + 1)
      const day = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      const inDay = orders.filter(o => {
        const t = new Date(o.created_at)
        return t >= d && t < next
      })
      days.push({
        day,
        confirmed: inDay.filter(o => ['confirmed','prepared','shipped_to_agent','shipped','delivered'].includes(o.status)).length,
        delivered: inDay.filter(o => o.status === 'delivered').length,
      })
    }
    return days
  }, [orders])

  const breakdown = useMemo(() => ([
    { label: 'Confirmed',       value: stats.confirmed,        color: '#10b981' },
    { label: 'Prepared',        value: stats.prepared,         color: '#6366f1' },
    { label: 'Sent to Agent',   value: stats.shipped_to_agent, color: '#9333ea' },
    { label: 'Shipped',         value: stats.shipped,          color: '#3b82f6' },
    { label: 'Delivered',       value: stats.delivered,        color: '#0ea5e9' },
    { label: 'Cancelled',       value: stats.cancelled,        color: '#9ca3af' },
  ]), [stats])

  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return filteredByPeriod.filter(o => {
      const matchSearch = !q ||
        o.tracking_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        (o.customer_phone || '').includes(search) ||
        (o.customer_city || '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || o.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [filteredByPeriod, search, statusFilter])

  const allForDuplicates = useMemo(() => [...pending, ...orders], [pending, orders])
  const duplicateMap = useMemo(() => detectDuplicates(allForDuplicates), [allForDuplicates])

  const advance = async (o: OrderRow) => {
    const nextStatus = statusFlow[o.status]?.next
    if (!nextStatus) return
    setBusyId(o.id)
    const patch: any = { status: nextStatus, last_call_at: new Date().toISOString() }
    if (nextStatus === 'shipped_to_agent') patch.shipped_to_agent_at = new Date().toISOString()
    if (nextStatus === 'shipped') patch.shipped_at = new Date().toISOString()
    if (nextStatus === 'delivered') patch.delivered_at = new Date().toISOString()
    await supabase.from('orders').update(patch).eq('id', o.id)
    setOrders(prev => prev.map(x => x.id === o.id ? { ...x, ...patch } : x))
    setBusyId(null)
  }

  const markPaid = async (o: OrderRow) => {
    setBusyId(o.id)
    await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', o.id)
    setOrders(prev => prev.map(x => x.id === o.id ? { ...x, payment_status: 'paid' } : x))
    setBusyId(null)
  }

  const cancelOrder = async (o: OrderRow) => {
    if (!confirm(`Cancel order ${o.tracking_number}?`)) return
    setBusyId(o.id)
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', o.id)
    setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status: 'cancelled' } : x))
    setBusyId(null)
  }

  const reopenForCall = async (o: OrderRow) => {
    setBusyId(o.id)
    await supabase
      .from('orders')
      .update({ status: 'pending', reminded_at: null })
      .eq('id', o.id)
    setBusyId(null)
    router.push('/agent/calls')
  }

  const openHistory = async (o: OrderRow) => {
    setHistoryOrder(o)
    const { data } = await supabase
      .from('call_logs')
      .select('*')
      .eq('order_id', o.id)
      .order('created_at', { ascending: false })
    setHistoryLogs((data || []) as CallLog[])
  }

  const cleanPhone = (p: string) => {
    let num = (p || '').replace(/[^\d+]/g, '')
    if (/^0[17]\d{8}$/.test(num)) num = '254' + num.slice(1)
    return num
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-[#1a1c3a] text-lg">Call Center Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">{agentName} · Manage confirmations through delivery</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(agentId)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            <RotateCcw size={13} /> Refresh
          </button>
          <Link
            href="/agent/calls"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1c3a] hover:bg-[#252750] text-white text-sm font-bold rounded-xl"
          >
            <Phone size={15} />
            Start Calling ({stats.toCall})
          </Link>
        </div>
      </div>

      <div className="px-6 pt-5 pb-10 space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={14} className="text-gray-400" />
          {(['today','yesterday','this_week','last_week','this_month','all','custom'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                period === p ? 'bg-[#1a1c3a] text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              )}
            >
              {periodLabels[p]}
            </button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#f4991a]"
              />
              <span className="text-xs text-gray-400">→</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#f4991a]"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'To Call',       value: stats.toCall,          icon: Phone,       color: 'text-rose-600',    bg: 'bg-rose-50'    },
            { label: 'Total',         value: stats.total,           icon: Package,     color: 'text-[#1a1c3a]',   bg: 'bg-white'      },
            { label: 'Confirmed',     value: stats.confirmed,       icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Prepared',      value: stats.prepared,        icon: Package,     color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
            { label: 'Sent to Agent', value: stats.shipped_to_agent, icon: ArrowRight,  color: 'text-purple-600',  bg: 'bg-purple-50'  },
            { label: 'Shipped',       value: stats.shipped,         icon: Send,        color: 'text-blue-600',    bg: 'bg-blue-50'    },
            { label: 'Delivered',     value: stats.delivered,       icon: Truck,       color: 'text-sky-600',     bg: 'bg-sky-50'     },
            { label: 'Paid',       value: stats.paid,      icon: DollarSign,  color: 'text-[#f4991a]',   bg: 'bg-orange-50'  },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-gray-100 shadow-sm p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center">
                  <s.icon size={16} className={s.color} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#1a1c3a]">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-[#1a1c3a] rounded-2xl p-5">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">Confirmation Rate</p>
            <p className="text-white font-bold text-3xl">{confirmRate}%</p>
            <p className="text-white/40 text-xs mt-1">{stats.done} done out of {stats.total}</p>
            <div className="h-2 mt-3 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#f4991a] to-orange-400 rounded-full" style={{ width: `${confirmRate}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">Delivery Rate</p>
            <p className="text-emerald-600 font-bold text-3xl">{deliveryRate}%</p>
            <p className="text-gray-400 text-xs mt-1">{stats.delivered} delivered out of {stats.done} confirmed</p>
            <div className="h-2 mt-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${deliveryRate}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">Revenue (delivered)</p>
            <p className="text-[#f4991a] font-bold text-3xl">KES {stats.revenue.toLocaleString()}</p>
            <p className="text-gray-400 text-xs mt-1">From {stats.delivered} delivered orders</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-[#1a1c3a] text-sm mb-4">Confirmations & Deliveries (last 14 days)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="cfm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dlv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="confirmed" stroke="#10b981" fill="url(#cfm)" strokeWidth={2} />
                  <Area type="monotone" dataKey="delivered" stroke="#0ea5e9" fill="url(#dlv)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-[#1a1c3a] text-sm mb-4">Status Breakdown</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {breakdown.map((b, i) => <Cell key={i} fill={b.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-[#1a1c3a] text-sm">My Orders Pipeline</h3>
              <p className="text-xs text-gray-400 mt-0.5">From confirmation to delivery — manage status here</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 focus:outline-none"
              >
                <option value="all">All status</option>
                <option value="confirmed">Confirmed</option>
                <option value="prepared">Prepared</option>
                <option value="shipped_to_agent">Sent to Agent</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-left">
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Tracking</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Customer</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">City</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Amount</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Payment</th>
                  <th className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-sm text-gray-400">Loading…</td></tr>
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <Package size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No orders in this period</p>
                    </td>
                  </tr>
                ) : tableRows.map(o => {
                  const flow = statusFlow[o.status]
                  const isFinal = o.status === 'delivered' || o.status === 'cancelled'
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono font-bold text-[#1a1c3a]">{o.tracking_number}</span>
                          {duplicateMap.get(o.id)?.isDuplicate && (
                            <span className="text-[8px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 py-0.5 rounded">DUP</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{new Date(o.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-[10px] font-bold text-[#1a1c3a]">
                            {(o.customer_name || '?')[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#1a1c3a]">{o.customer_name}</div>
                            <div className="text-[10px] text-gray-400">{o.customer_phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-600">{o.customer_city}</td>
                      <td className="px-4 py-3 text-xs font-bold text-[#1a1c3a]">
                        {(o.total_amount || 0) > 0 ? `KES ${o.total_amount.toLocaleString()}` : '—'}
                        {o.original_total && o.original_total !== o.total_amount && o.original_total > 0 && (
                          <span className="text-[9px] text-gray-400 line-through ml-1">KES {o.original_total.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border', statusColors[o.status] || statusColors.pending)}>
                          {statusLabels[o.status] || o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {o.payment_status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <DollarSign size={9} /> Paid
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Unpaid</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end flex-wrap">
                          <a
                            href={`tel:${cleanPhone(o.customer_phone)}`}
                            title="Call customer"
                            className="w-7 h-7 rounded-lg bg-[#f4991a] hover:bg-orange-500 text-white flex items-center justify-center"
                          >
                            <Phone size={12} />
                          </a>
                          <button
                            onClick={() => {
                              const num = cleanPhone(o.customer_phone).replace(/^\+/, '')
                              window.location.href = `https://wa.me/${num}?text=${encodeURIComponent(`Hello 👋 ${o.customer_name}, regarding your order *${o.tracking_number}*. How can we help you?`)}`
                            }}
                            title="WhatsApp"
                            className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center"
                          >
                            <MessageCircle size={12} />
                          </button>
                          <button
                            disabled={busyId === o.id}
                            onClick={() => reopenForCall(o)}
                            title="Reopen & call again"
                            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center disabled:opacity-50"
                          >
                            <RotateCcw size={11} />
                          </button>
                          <button
                            onClick={() => openHistory(o)}
                            title="Call history"
                            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 flex items-center justify-center"
                          >
                            <Clock size={11} />
                          </button>
                          {!isFinal && flow?.next && (
                            <button
                              disabled={busyId === o.id}
                              onClick={() => advance(o)}
                              className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold text-white disabled:opacity-50', flow.color)}
                              title={flow.label}
                            >
                              {flow.label}
                            </button>
                          )}
                          {o.status === 'delivered' && o.payment_status !== 'paid' && (
                            <button
                              disabled={busyId === o.id}
                              onClick={() => markPaid(o)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#f4991a] hover:bg-orange-500 text-white disabled:opacity-50"
                            >
                              Mark Paid
                            </button>
                          )}
                          {!isFinal && (
                            <button
                              disabled={busyId === o.id}
                              onClick={() => cancelOrder(o)}
                              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-50"
                              title="Cancel"
                            >
                              <X size={12} />
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
          <div className="px-6 py-3 border-t border-gray-50 text-xs text-gray-400">
            Showing {tableRows.length} of {filteredByPeriod.length} orders ({periodLabels[period]})
          </div>
        </div>
      </div>

      {/* Call History Modal */}
      {historyOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setHistoryOrder(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between px-6 py-4 bg-[#1a1c3a] text-white">
              <div>
                <p className="text-white/50 text-[10px] uppercase tracking-wider">Call History</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold font-mono">{historyOrder.tracking_number}</p>
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', statusColors[historyOrder.status] || statusColors.pending)}>
                    {statusLabels[historyOrder.status] || historyOrder.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setHistoryOrder(null)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {historyLogs.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No calls logged yet</p>
              ) : historyLogs.map(log => (
                <div key={log.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                      log.action === 'confirmed'        && 'bg-emerald-100 text-emerald-700',
                      log.action === 'not_reached'      && 'bg-red-100 text-red-700',
                      log.action === 'cancelled'        && 'bg-gray-200 text-gray-600',
                      log.action === 'rescheduled'      && 'bg-blue-100 text-blue-700',
                      log.action === 'whatsapp_contact' && 'bg-green-100 text-green-700',
                    )}>
                      {log.action === 'whatsapp_contact' ? 'WhatsApp' : log.action.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    By <span className="font-semibold">{log.agent_name || 'Agent'}</span>
                  </p>
                  {log.note && <p className="text-xs text-gray-500 mt-1 italic">"{log.note}"</p>}
                  {log.reminded_at && (
                    <p className="text-[10px] text-blue-600 mt-1">
                      Reminder: {new Date(log.reminded_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between gap-2">
              <button
                onClick={() => { reopenForCall(historyOrder); setHistoryOrder(null) }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-lg"
              >
                <Phone size={12} /> Call again
              </button>
              <button
                onClick={() => setHistoryOrder(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
