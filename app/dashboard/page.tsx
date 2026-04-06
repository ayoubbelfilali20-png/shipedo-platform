'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { mockOrders, mockSellers, mockAgents } from '@/lib/data'
import { formatDate } from '@/lib/utils'
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
import { SellerStatus, AgentStatus } from '@/lib/types'

/* ─── Platform stats ─────────────────────────────── */
const totalOrders     = mockOrders.length
const deliveredOrders = mockOrders.filter(o => o.status === 'delivered').length
const returnedOrders  = mockOrders.filter(o => o.status === 'returned').length
const pendingOrders   = mockOrders.filter(o => o.status === 'pending').length
const totalRevenue    = mockOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.totalAmount, 0)
const deliveryRate    = totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : '0'
const returnRate      = totalOrders > 0 ? ((returnedOrders / totalOrders) * 100).toFixed(1) : '0'
const totalPendingPayout = mockSellers.reduce((s, sl) => s + sl.pendingPayout, 0)

const revenueChart = [
  { month: 'Aug', revenue: 198000 },
  { month: 'Sep', revenue: 172000 },
  { month: 'Oct', revenue: 245000 },
  { month: 'Nov', revenue: 312000 },
  { month: 'Dec', revenue: 398000 },
  { month: 'Jan', revenue: 458200 },
]

const orderStatusChart = [
  { label: 'Delivered', value: deliveredOrders,  color: '#10b981' },
  { label: 'Pending',   value: pendingOrders,     color: '#f59e0b' },
  { label: 'Returned',  value: returnedOrders,    color: '#ef4444' },
  { label: 'Shipped',   value: mockOrders.filter(o => o.status === 'shipped').length, color: '#6366f1' },
]

/* ─── Seller derived stats ───────────────────────── */
const sellerStats = mockSellers.map(s => {
  const orders = mockOrders.filter(o => o.sellerId === s.id)
  const delivered = orders.filter(o => o.status === 'delivered').length
  const returned  = orders.filter(o => o.status === 'returned').length
  const rate      = orders.length > 0 ? ((delivered / orders.length) * 100).toFixed(0) : '0'
  const retRate   = orders.length > 0 ? ((returned / orders.length) * 100).toFixed(0) : '0'
  return { ...s, orderCount: orders.length, delivered, returned, rate: parseInt(rate), retRate: parseInt(retRate) }
})

/* ─── Agent derived stats ────────────────────────── */
const agentStats = mockAgents.map(a => ({
  ...a,
  rate: a.totalCalls > 0 ? Math.round((a.confirmed / a.totalCalls) * 100) : 0,
  notReachedRate: a.totalCalls > 0 ? Math.round((a.notReached / a.totalCalls) * 100) : 0,
}))

const totalCalls    = mockAgents.reduce((s, a) => s + a.totalCalls, 0)
const totalConfirmed = mockAgents.reduce((s, a) => s + a.confirmed, 0)
const totalNotReached = mockAgents.reduce((s, a) => s + a.notReached, 0)
const totalRescheduled = mockAgents.reduce((s, a) => s + a.rescheduled, 0)
const avgConfirmRate = mockAgents.length > 0
  ? (agentStats.reduce((s, a) => s + a.rate, 0) / mockAgents.length).toFixed(0) : '0'
const activeAgents = mockAgents.filter(a => a.status === 'active').length
const activeSellers = mockSellers.filter(s => s.status === 'active').length

/* ─── Badge helpers ──────────────────────────────── */
const sellerStatusCfg: Record<SellerStatus, { color: string; bg: string; dot: string }> = {
  active:    { color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  pending:   { color: 'text-yellow-700',  bg: 'bg-yellow-50',  dot: 'bg-yellow-500'  },
  suspended: { color: 'text-red-600',     bg: 'bg-red-50',     dot: 'bg-red-500'     },
}
const agentStatusCfg: Record<AgentStatus, { color: string; bg: string; dot: string }> = {
  active:    { color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  inactive:  { color: 'text-gray-500',    bg: 'bg-gray-100',   dot: 'bg-gray-400'    },
  suspended: { color: 'text-red-600',     bg: 'bg-red-50',     dot: 'bg-red-500'     },
}

function SellerBadge({ status }: { status: SellerStatus }) {
  const s = sellerStatusCfg[status]
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full', s.color, s.bg)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />{status}
    </span>
  )
}
function AgentBadge({ status }: { status: AgentStatus }) {
  const s = agentStatusCfg[status]
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

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header title="Admin Dashboard" subtitle="Platform management overview" role="admin" />

      <div className="p-6 space-y-5">

        {/* ── Row 1: Platform KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue',    value: `KES ${(totalRevenue/1000).toFixed(0)}K`,  sub: 'From delivered orders',        icon: Wallet,    iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50',  href: '/dashboard/analytics' },
            { label: 'Platform Orders',  value: totalOrders,                               sub: `${pendingOrders} pending`,     icon: Package,   iconColor: 'text-purple-600',  iconBg: 'bg-purple-50',   href: '/dashboard/orders'    },
            { label: 'Delivery Rate',    value: `${deliveryRate}%`,                        sub: `${returnRate}% return rate`,   icon: TrendingUp,iconColor: 'text-blue-600',    iconBg: 'bg-blue-50',     href: '/dashboard/analytics' },
            { label: 'Pending Payouts',  value: `KES ${(totalPendingPayout/1000).toFixed(0)}K`, sub: 'Across all sellers',     icon: Clock,     iconColor: 'text-orange-600',  iconBg: 'bg-orange-50',   href: '/dashboard/transactions'},
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

        {/* ── Row 2: Revenue chart + Order status breakdown ── */}
        <div className="grid xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#1a1c3a]">Platform Revenue</h2>
                <p className="text-xs text-gray-400 mt-0.5">All sellers — monthly trend</p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">
                +18% vs last month
              </span>
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

          {/* Order status breakdown */}
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
                    <span className="text-gray-400 text-[10px]">{totalOrders > 0 ? ((s.value / totalOrders) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 3: Sellers deep analysis ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
                <Store size={15} className="text-[#f4991a]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1a1c3a]">Sellers Performance</h3>
                <p className="text-xs text-gray-400">{activeSellers} active · {mockSellers.filter(s => s.status === 'pending').length} pending · {mockSellers.filter(s => s.status === 'suspended').length} suspended</p>
              </div>
            </div>
            <Link href="/dashboard/sellers" className="flex items-center gap-1 text-xs font-semibold text-[#f4991a] hover:underline">
              Manage <ArrowRight size={12} />
            </Link>
          </div>

          {/* Seller table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  {['Seller', 'City', 'Orders', 'Revenue', 'Delivery Rate', 'Return Rate', 'Pending Payout', 'Status', 'Alert'].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 first:px-5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sellerStats.map(s => {
                  const alert = s.status === 'suspended' ? 'suspended'
                    : s.retRate >= 30 ? 'high-return'
                    : s.status === 'pending' ? 'pending-verify'
                    : null
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/40 transition-colors cursor-pointer" onClick={() => router.push('/dashboard/sellers')}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-xs font-bold text-[#1a1c3a] flex-shrink-0">
                            {s.storeName[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#1a1c3a]">{s.storeName}</p>
                            <p className="text-[10px] text-gray-400">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{s.city}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-bold text-[#1a1c3a]">{s.totalOrders}</span>
                        <p className="text-[10px] text-gray-400">{s.delivered} delivered</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-bold text-[#1a1c3a]">KES {s.totalRevenue.toLocaleString()}</span>
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
                      <td className="px-4 py-3.5">
                        <span className={cn('text-xs font-bold', s.pendingPayout > 0 ? 'text-orange-600' : 'text-gray-400')}>
                          KES {s.pendingPayout.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5"><SellerBadge status={s.status} /></td>
                      <td className="px-4 py-3.5">
                        {alert === 'suspended' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            <XCircle size={9} /> Suspended
                          </span>
                        )}
                        {alert === 'high-return' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={9} /> High Returns
                          </span>
                        )}
                        {alert === 'pending-verify' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                            <Clock size={9} /> Verify Docs
                          </span>
                        )}
                        {!alert && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle size={9} /> Good
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

        {/* ── Row 4: Call Center deep analysis ── */}
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

          {/* Call center summary stats */}
          <div className="grid grid-cols-4 gap-px bg-gray-100 border-b border-gray-100">
            {[
              { label: 'Total Calls',   value: totalCalls,      icon: Phone,     color: 'text-[#1a1c3a]',   bg: 'bg-white' },
              { label: 'Confirmed',     value: totalConfirmed,  icon: CheckCircle,color: 'text-emerald-600', bg: 'bg-white' },
              { label: 'Not Reached',   value: totalNotReached, icon: XCircle,   color: 'text-red-500',     bg: 'bg-white' },
              { label: 'Rescheduled',   value: totalRescheduled,icon: RotateCcw, color: 'text-blue-600',    bg: 'bg-white' },
            ].map(s => (
              <div key={s.label} className={cn('px-5 py-4 flex items-center gap-3', s.bg)}>
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

          {/* Agent rows */}
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
                {agentStats.map(a => {
                  const perf = a.rate >= 70 ? 'top' : a.rate >= 50 ? 'avg' : 'low'
                  return (
                    <tr key={a.id} className="hover:bg-gray-50/40 transition-colors cursor-pointer" onClick={() => router.push('/dashboard/agents')}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                            {a.name[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#1a1c3a]">{a.name}</p>
                            <p className="text-[10px] text-gray-400">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><AgentBadge status={a.status} /></td>
                      <td className="px-4 py-3.5 text-xs font-bold text-[#1a1c3a]">{a.totalCalls}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-bold text-emerald-600">{a.confirmed}</span>
                        <span className="text-[10px] text-gray-400 ml-1">{a.totalCalls > 0 ? ((a.confirmed/a.totalCalls)*100).toFixed(0) : 0}%</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-bold text-red-500">{a.notReached}</span>
                        <span className="text-[10px] text-gray-400 ml-1">{a.totalCalls > 0 ? ((a.notReached/a.totalCalls)*100).toFixed(0) : 0}%</span>
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

        {/* ── Row 5: Recent orders + Quick actions ── */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Recent orders */}
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
              {mockOrders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/40 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                    {order.customerName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1a1c3a] truncate">{order.customerName}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{order.trackingNumber} · {order.sellerName}</p>
                  </div>
                  <div className="text-right flex-shrink-0 mr-2">
                    <p className="text-xs font-bold text-[#1a1c3a]">KES {order.totalAmount.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">{formatDate(order.createdAt)}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Quick Actions</h3>
            {[
              { label: 'Add Seller',   desc: 'Register new seller account',  icon: UserPlus,  bg: 'bg-[#f4991a]',   text: 'text-white',     href: '/dashboard/sellers'     },
              { label: 'Add Agent',    desc: 'Create new call agent',         icon: Headphones,bg: 'bg-[#1a1c3a]',   text: 'text-white',     href: '/dashboard/agents'      },
              { label: 'New Order',    desc: 'Manual order entry',            icon: Package,   bg: 'bg-white',       text: 'text-[#1a1c3a]', href: '/dashboard/orders/new'  },
              { label: 'Analytics',   desc: 'Full platform reports',          icon: BarChart3, bg: 'bg-white',       text: 'text-[#1a1c3a]', href: '/dashboard/analytics'   },
              { label: 'COD Tracking',desc: 'Cash on delivery status',        icon: Wallet,    bg: 'bg-white',       text: 'text-[#1a1c3a]', href: '/dashboard/cod'         },
              { label: 'Fulfillment', desc: 'Warehouse operations',           icon: Truck,     bg: 'bg-white',       text: 'text-[#1a1c3a]', href: '/dashboard/fulfillment' },
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
