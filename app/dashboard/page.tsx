'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  Store, Package, TrendingUp, ArrowRight, ArrowUpRight,
  CheckCircle, Clock, XCircle, RotateCcw,
  Phone, Headphones, UserPlus, BarChart3,
  Wallet, AlertTriangle, Truck,
  Star, TrendingDown, Activity
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'

type OrderRow = {
  id: string
  tracking_number: string
  customer_name: string
  seller_id: string | null
  total_amount: number
  status: string
  call_attempts?: number | null
  last_call_agent_id?: string | null
  reminded_at?: string | null
  created_at: string
}

type SellerRow = {
  id: string
  name: string
  company?: string | null
  email: string
  city?: string | null
  status: string
}

type AgentRow = {
  id: string
  name: string
  email: string
  status: string
}

const sellerStatusCfg: Record<string, { color: string; bg: string; dot: string }> = {
  active:    { color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  pending:   { color: 'text-yellow-700',  bg: 'bg-yellow-50',  dot: 'bg-yellow-500'  },
  suspended: { color: 'text-red-600',     bg: 'bg-red-50',     dot: 'bg-red-500'     },
}
const agentStatusCfg: Record<string, { color: string; bg: string; dot: string }> = {
  active:    { color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  inactive:  { color: 'text-gray-500',    bg: 'bg-gray-100',   dot: 'bg-gray-400'    },
  suspended: { color: 'text-red-600',     bg: 'bg-red-50',     dot: 'bg-red-500'     },
}

function Badge({ status, cfg }: { status: string; cfg: Record<string, any> }) {
  const s = cfg[status] || cfg.inactive || cfg.pending
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full', s.color, s.bg)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />{status}
    </span>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-20 flex-shrink-0">
      <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
    </div>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [sellers, setSellers] = useState<SellerRow[]>([])
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('sellers').select('id, name, company, email, city, status'),
      supabase.from('agents').select('id, name, email, status'),
    ]).then(([o, s, a]) => {
      setOrders((o.data || []) as OrderRow[])
      setSellers((s.data || []) as SellerRow[])
      setAgents((a.data || []) as AgentRow[])
      setLoading(false)
    })
  }, [])

  const stats = useMemo(() => {
    const total = orders.length
    const delivered = orders.filter(o => o.status === 'delivered').length
    const returned = orders.filter(o => o.status === 'returned').length
    const pending = orders.filter(o => o.status === 'pending').length
    const shipped = orders.filter(o => o.status === 'shipped').length
    const revenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total_amount || 0), 0)
    return {
      total, delivered, returned, pending, shipped, revenue,
      deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : '0',
      returnRate:   total > 0 ? ((returned / total) * 100).toFixed(1) : '0',
    }
  }, [orders])

  const revenueChart = useMemo(() => {
    const now = new Date()
    const months: { month: string; revenue: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = m.toLocaleDateString('en-US', { month: 'short' })
      const rev = orders
        .filter(o => o.status === 'delivered')
        .filter(o => {
          const d = new Date(o.created_at)
          return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear()
        })
        .reduce((s, o) => s + (o.total_amount || 0), 0)
      months.push({ month: label, revenue: rev })
    }
    return months
  }, [orders])

  const orderStatusChart = [
    { label: 'Delivered', value: stats.delivered, color: '#10b981' },
    { label: 'Pending',   value: stats.pending,   color: '#f59e0b' },
    { label: 'Returned',  value: stats.returned,  color: '#ef4444' },
    { label: 'Shipped',   value: stats.shipped,   color: '#6366f1' },
  ]

  const sellerStats = useMemo(() => {
    return sellers.map(s => {
      const sOrders = orders.filter(o => o.seller_id === s.id)
      const delivered = sOrders.filter(o => o.status === 'delivered').length
      const returned = sOrders.filter(o => o.status === 'returned').length
      const revenue = sOrders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + (o.total_amount || 0), 0)
      const rate = sOrders.length > 0 ? Math.round((delivered / sOrders.length) * 100) : 0
      const retRate = sOrders.length > 0 ? Math.round((returned / sOrders.length) * 100) : 0
      return { ...s, orderCount: sOrders.length, delivered, returned, revenue, rate, retRate }
    })
  }, [sellers, orders])

  const agentStats = useMemo(() => {
    return agents.map(a => {
      const handled = orders.filter(o => o.last_call_agent_id === a.id)
      const totalCalls = handled.reduce((sum, o) => sum + (o.call_attempts || 0), 0) || handled.length
      const confirmed = handled.filter(o => ['confirmed','prepared','shipped','delivered'].includes(o.status)).length
      const notReached = handled.filter(o => o.status === 'pending' && (o.call_attempts || 0) > 0 && !o.reminded_at).length
      const rescheduled = handled.filter(o => o.status === 'pending' && !!o.reminded_at).length
      const rate = totalCalls > 0 ? Math.round((confirmed / totalCalls) * 100) : 0
      return { ...a, totalCalls, confirmed, notReached, rescheduled, rate }
    })
  }, [agents, orders])

  const totalCalls = agentStats.reduce((s, a) => s + a.totalCalls, 0)
  const totalConfirmed = agentStats.reduce((s, a) => s + a.confirmed, 0)
  const totalNotReached = agentStats.reduce((s, a) => s + a.notReached, 0)
  const totalRescheduled = agentStats.reduce((s, a) => s + a.rescheduled, 0)
  const avgConfirmRate = agentStats.length > 0
    ? (agentStats.reduce((s, a) => s + a.rate, 0) / agentStats.length).toFixed(0) : '0'
  const activeAgents = agents.filter(a => a.status === 'active').length
  const activeSellers = sellers.filter(s => s.status === 'active').length

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header title="Admin Dashboard" subtitle="Platform management overview" role="admin" />

      <div className="p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue',   value: `KES ${(stats.revenue/1000).toFixed(0)}K`, sub: 'From delivered orders',     icon: Wallet,    iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50',  href: '/dashboard/analytics' },
            { label: 'Platform Orders', value: stats.total,                                sub: `${stats.pending} pending`,  icon: Package,   iconColor: 'text-purple-600',  iconBg: 'bg-purple-50',   href: '/dashboard/orders'    },
            { label: 'Delivery Rate',   value: `${stats.deliveryRate}%`,                   sub: `${stats.returnRate}% returns`,icon: TrendingUp,iconColor: 'text-blue-600',    iconBg: 'bg-blue-50',     href: '/dashboard/analytics' },
            { label: 'Active Sellers',  value: activeSellers,                              sub: `${sellers.length} total`,   icon: Store,     iconColor: 'text-orange-600',  iconBg: 'bg-orange-50',   href: '/dashboard/sellers'   },
          ].map(s => (
            <Link key={s.label} href={s.href}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.iconBg)}>
                  <s.icon size={19} className={s.iconColor} />
                </div>
                <ArrowUpRight size={14} className="text-gray-200 group-hover:text-[#f4991a] transition-colors" />
              </div>
              <div className="text-2xl font-bold text-[#1a1c3a] mb-0.5">{s.value}</div>
              <div className="text-xs font-semibold text-gray-500">{s.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
            </Link>
          ))}
        </div>

        {/* Revenue + Status */}
        <div className="grid xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-[#1a1c3a]">Platform Revenue</h2>
              <p className="text-xs text-gray-400 mt-0.5">All sellers — last 6 months</p>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f4991a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f4991a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}K`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} formatter={(v: number) => [`KES ${v.toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#f4991a" strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[#1a1c3a] mb-1">Order Breakdown</h2>
            <p className="text-xs text-gray-400 mb-4">All sellers combined</p>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={orderStatusChart} barSize={32}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '11px' }} formatter={(v: number) => [v, 'orders']} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {orderStatusChart.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-3">
              {orderStatusChart.map(s => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-gray-500">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1a1c3a]">{s.value}</span>
                    <span className="text-gray-400 text-[10px]">{stats.total > 0 ? ((s.value / stats.total) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sellers performance */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
                <Store size={15} className="text-[#f4991a]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1a1c3a]">Sellers Performance</h3>
                <p className="text-xs text-gray-400">{activeSellers} active · {sellers.filter(s => s.status === 'pending').length} pending · {sellers.filter(s => s.status === 'suspended').length} suspended</p>
              </div>
            </div>
            <Link href="/dashboard/sellers" className="flex items-center gap-1 text-xs font-semibold text-[#f4991a] hover:underline">
              Manage <ArrowRight size={12} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  {['Seller', 'City', 'Orders', 'Revenue', 'Delivery Rate', 'Return Rate', 'Status'].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 first:px-5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="py-10 text-center text-xs text-gray-400">Loading…</td></tr>
                ) : sellerStats.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-xs text-gray-400">No sellers yet</td></tr>
                ) : sellerStats.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/40 transition-colors cursor-pointer" onClick={() => router.push('/dashboard/sellers')}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-xs font-bold text-[#1a1c3a] flex-shrink-0">
                          {(s.company || s.name || '?')[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#1a1c3a]">{s.company || s.name}</p>
                          <p className="text-[10px] text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{s.city || '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-bold text-[#1a1c3a]">{s.orderCount}</span>
                      <p className="text-[10px] text-gray-400">{s.delivered} delivered</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-bold text-[#1a1c3a]">{s.revenue > 0 ? `KES ${s.revenue.toLocaleString()}` : '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <MiniBar value={s.rate} max={100} color="bg-emerald-400" />
                        <span className={cn('text-xs font-bold', s.rate >= 70 ? 'text-emerald-600' : s.rate >= 50 ? 'text-yellow-600' : 'text-red-500')}>
                          {s.rate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <MiniBar value={s.retRate} max={100} color={s.retRate >= 30 ? 'bg-red-400' : 'bg-gray-300'} />
                        <span className={cn('text-xs font-bold', s.retRate >= 30 ? 'text-red-500' : 'text-gray-500')}>
                          {s.retRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><Badge status={s.status} cfg={sellerStatusCfg} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Call center performance */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <Headphones size={15} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1a1c3a]">Call Center Performance</h3>
                <p className="text-xs text-gray-400">{activeAgents} active agents · {totalCalls} total calls · {avgConfirmRate}% avg confirmation</p>
              </div>
            </div>
            <Link href="/dashboard/agents" className="flex items-center gap-1 text-xs font-semibold text-[#f4991a] hover:underline">
              Manage <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-px bg-gray-100 border-b border-gray-100">
            {[
              { label: 'Total Calls',   value: totalCalls,       icon: Phone,       color: 'text-[#1a1c3a]'   },
              { label: 'Confirmed',     value: totalConfirmed,   icon: CheckCircle, color: 'text-emerald-600' },
              { label: 'Not Reached',   value: totalNotReached,  icon: XCircle,     color: 'text-red-500'     },
              { label: 'Rescheduled',   value: totalRescheduled, icon: RotateCcw,   color: 'text-blue-600'    },
            ].map(s => (
              <div key={s.label} className="px-5 py-4 flex items-center gap-3 bg-white">
                <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <s.icon size={15} className={s.color} />
                </div>
                <div>
                  <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  {['Agent', 'Status', 'Total Calls', 'Confirmed', 'Not Reached', 'Rescheduled', 'Confirm Rate', 'Performance'].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 first:px-5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={8} className="py-10 text-center text-xs text-gray-400">Loading…</td></tr>
                ) : agentStats.length === 0 ? (
                  <tr><td colSpan={8} className="py-10 text-center text-xs text-gray-400">No agents yet</td></tr>
                ) : agentStats.map(a => {
                  const perf = a.rate >= 70 ? 'top' : a.rate >= 50 ? 'avg' : 'low'
                  return (
                    <tr key={a.id} className="hover:bg-gray-50/40 transition-colors cursor-pointer" onClick={() => router.push('/dashboard/agents')}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                            {(a.name || '?')[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#1a1c3a]">{a.name}</p>
                            <p className="text-[10px] text-gray-400">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><Badge status={a.status} cfg={agentStatusCfg} /></td>
                      <td className="px-4 py-3.5 text-xs font-bold text-[#1a1c3a]">{a.totalCalls}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-bold text-emerald-600">{a.confirmed}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-bold text-red-500">{a.notReached}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-bold text-blue-600">{a.rescheduled}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <MiniBar value={a.rate} max={100} color={a.rate >= 70 ? 'bg-emerald-400' : a.rate >= 50 ? 'bg-yellow-400' : 'bg-red-400'} />
                          <span className={cn('text-xs font-bold', a.rate >= 70 ? 'text-emerald-600' : a.rate >= 50 ? 'text-yellow-600' : 'text-red-500')}>
                            {a.rate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {perf === 'top' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Star size={9} /> Top
                          </span>
                        )}
                        {perf === 'avg' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                            <Activity size={9} /> Average
                          </span>
                        )}
                        {perf === 'low' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            <TrendingDown size={9} /> Needs Work
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent orders */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-[#1a1c3a]">Recent Orders</h3>
                <p className="text-xs text-gray-400">All sellers — latest</p>
              </div>
              <Link href="/dashboard/orders" className="flex items-center gap-1 text-xs font-semibold text-[#f4991a] hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                <div className="py-10 text-center text-xs text-gray-400">Loading…</div>
              ) : orders.length === 0 ? (
                <div className="py-10 text-center text-xs text-gray-400">No orders yet</div>
              ) : orders.slice(0, 5).map(order => {
                const seller = sellers.find(s => s.id === order.seller_id)
                return (
                  <div key={order.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/40 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                      {(order.customer_name || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1a1c3a] truncate">{order.customer_name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{order.tracking_number} · {seller?.company || seller?.name || '—'}</p>
                    </div>
                    <div className="text-right flex-shrink-0 mr-2">
                      <p className="text-xs font-bold text-[#1a1c3a]">{(order.total_amount || 0) > 0 ? `KES ${order.total_amount.toLocaleString()}` : '—'}</p>
                      <p className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={order.status as any} />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Quick Actions</h3>
            {[
              { label: 'Add Seller',    desc: 'Register new seller account', icon: UserPlus,   bg: 'bg-[#f4991a]', text: 'text-white',     href: '/dashboard/sellers'   },
              { label: 'Add Agent',     desc: 'Create new call agent',        icon: Headphones, bg: 'bg-[#1a1c3a]', text: 'text-white',     href: '/dashboard/agents'    },
              { label: 'View Orders',   desc: 'All platform orders',          icon: Package,    bg: 'bg-white',     text: 'text-[#1a1c3a]', href: '/dashboard/orders'    },
              { label: 'Analytics',     desc: 'Full platform reports',        icon: BarChart3,  bg: 'bg-white',     text: 'text-[#1a1c3a]', href: '/dashboard/analytics' },
            ].map(a => (
              <Link key={a.label} href={a.href}
                className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group', a.bg)}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', a.bg === 'bg-white' ? 'bg-gray-50' : 'bg-white/20')}>
                  <a.icon size={15} className={cn(a.bg === 'bg-white' ? 'text-[#f4991a]' : 'text-white')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-bold', a.text)}>{a.label}</p>
                  <p className={cn('text-[10px]', a.bg === 'bg-white' ? 'text-gray-400' : 'text-white/60')}>{a.desc}</p>
                </div>
                <ArrowRight size={13} className={cn('flex-shrink-0 transition-colors', a.bg === 'bg-white' ? 'text-gray-200 group-hover:text-[#f4991a]' : 'text-white/30 group-hover:text-white')} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
