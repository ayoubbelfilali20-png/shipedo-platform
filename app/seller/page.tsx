'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/dashboard/Header'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { supabase } from '@/lib/supabase'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  Package, CheckCircle, Truck, RotateCcw, CreditCard, Clock,
  Plus, ArrowRight, TrendingUp, ShoppingBag, Phone, Eye,
  Wallet, Bell, LogOut, ChevronUp, ChevronDown, FileText, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrderStatus } from '@/lib/types'
import { useT, type TKey } from '@/lib/i18n'

type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'all'

const periodKeyMap: Record<Period, TKey> = {
  today:      'period_today',
  yesterday:  'period_yesterday',
  this_week:  'period_this_week',
  last_week:  'period_last_week',
  this_month: 'period_this_month',
  last_month: 'period_last_month',
  this_year:  'period_this_year',
  all:        'period_all_time',
}

const mobilePeriodKeyMap: Record<'today' | 'week' | 'month' | 'all', TKey> = {
  today: 'period_today',
  week:  'period_week',
  month: 'period_month',
  all:   'period_all',
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  confirmed: { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  shipped:   { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500'  },
  delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  returned:  { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
  cancelled: { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-500'    },
}

function inDesktopPeriod(dateStr: string, period: Period): boolean {
  if (period === 'all') return true
  const d = new Date(dateStr)
  const now = new Date()
  const startOfDay = (x: Date) => { const c = new Date(x); c.setHours(0,0,0,0); return c }
  const today = startOfDay(now)

  if (period === 'today')      return startOfDay(d).getTime() === today.getTime()
  if (period === 'yesterday') {
    const y = new Date(today); y.setDate(y.getDate() - 1)
    return startOfDay(d).getTime() === y.getTime()
  }
  if (period === 'this_week') {
    const start = new Date(today); start.setDate(start.getDate() - start.getDay())
    return d >= start
  }
  if (period === 'last_week') {
    const startThis = new Date(today); startThis.setDate(startThis.getDate() - startThis.getDay())
    const startLast = new Date(startThis); startLast.setDate(startLast.getDate() - 7)
    return d >= startLast && d < startThis
  }
  if (period === 'this_month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  if (period === 'last_month') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
  }
  if (period === 'this_year')  return d.getFullYear() === now.getFullYear()
  return true
}

function inMobilePeriod(dateStr: string, period: 'today' | 'week' | 'month' | 'all'): boolean {
  if (period === 'all') return true
  const d = new Date(dateStr)
  const now = new Date()
  if (period === 'today') return d.toDateString() === now.toDateString()
  if (period === 'week')  { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w }
  if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  return true
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function SellerDashboard() {
  const router = useRouter()
  const { t } = useT()
  const [orders, setOrders]     = useState<any[]>([])
  const [payouts, setPayouts]   = useState<any[]>([])
  const [userName, setUserName] = useState('Seller')
  const [loading, setLoading]   = useState(true)
  const [period, setPeriod]     = useState<Period>('this_month')
  const [mobilePeriod, setMobilePeriod] = useState<'today' | 'week' | 'month' | 'all'>('month')

  useEffect(() => {
    let sellerId: string | null = null
    try {
      const stored = localStorage.getItem('shipedo_user')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.role === 'seller') { sellerId = u.id; setUserName(u.fullName || u.name || 'Seller') }
      }
    } catch {}
    if (!sellerId) { setLoading(false); return }
    Promise.all([
      supabase.from('orders').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false }),
      supabase.from('seller_payouts').select('*').eq('seller_id', sellerId).eq('status', 'sent').order('period_end', { ascending: false }),
    ]).then(([ordersRes, payoutsRes]) => {
      setOrders(ordersRes.data || [])
      setPayouts(payoutsRes.data || [])
      setLoading(false)
    })
  }, [])

  const payoutSummary = useMemo(() => {
    const total = payouts.reduce((s, p) => s + Number(p.net_amount || 0), 0)
    const last  = payouts[0]
    return {
      count:    payouts.length,
      total,
      currency: payouts[0]?.currency ?? 'MAD',
      last,
    }
  }, [payouts])

  /* ── Desktop computed stats ── */
  const desktopStats = useMemo(() => {
    const filtered  = orders.filter(o => inDesktopPeriod(o.created_at, period))
    const total     = filtered.length
    const confirmed = filtered.filter(o => ['confirmed','shipped','delivered'].includes(o.status)).length
    const delivered = filtered.filter(o => o.status === 'delivered').length
    const returned  = filtered.filter(o => o.status === 'returned').length
    const pending   = filtered.filter(o => o.status === 'pending').length
    const revenue   = filtered.filter(o => o.status === 'delivered').reduce((s,o) => s + (o.total_amount || 0), 0)
    const confirmRate = total > 0 ? ((confirmed / total) * 100).toFixed(1) : '0'
    const deliveryRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : '0'
    const returnRate   = total > 0 ? ((returned / total) * 100).toFixed(1) : '0'
    return { filtered, total, confirmed, delivered, returned, pending, revenue, confirmRate, deliveryRate, returnRate }
  }, [orders, period])

  /* ── Revenue chart (last 6 months from delivered orders) ── */
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

  /* ── Order status pie ── */
  const statusPie = useMemo(() => {
    const total = desktopStats.filtered.length || 1
    const counts = {
      Delivered: desktopStats.delivered,
      Pending:   desktopStats.pending,
      Returned:  desktopStats.returned,
      Other:     desktopStats.filtered.filter(o => !['delivered','pending','returned'].includes(o.status)).length,
    }
    return [
      { name: t('dash_status_delivered'), value: Math.round((counts.Delivered / total) * 100), color: '#10b981' },
      { name: t('dash_status_pending'),   value: Math.round((counts.Pending   / total) * 100), color: '#f59e0b' },
      { name: t('dash_status_returned'),  value: Math.round((counts.Returned  / total) * 100), color: '#ef4444' },
      { name: t('dash_status_other'),     value: Math.round((counts.Other     / total) * 100), color: '#6366f1' },
    ]
  }, [desktopStats, t])

  /* ── Mobile computed stats ── */
  const mobileFiltered = useMemo(() => orders.filter(o => inMobilePeriod(o.created_at, mobilePeriod)), [orders, mobilePeriod])
  const mTotal     = mobileFiltered.length
  const mConfirmed = mobileFiltered.filter(o => ['confirmed','shipped','delivered'].includes(o.status)).length
  const mDelivered = mobileFiltered.filter(o => o.status === 'delivered').length
  const mReturned  = mobileFiltered.filter(o => o.status === 'returned').length
  const mPending   = mobileFiltered.filter(o => o.status === 'pending').length
  const mRevenue   = mobileFiltered.filter(o => o.status === 'delivered').reduce((s,o) => s + (o.total_amount||0), 0)
  const mConfirmRate = mTotal > 0 ? Math.round((mConfirmed / mTotal) * 100) : 0

  const handleLogout = () => {
    localStorage.removeItem('shipedo_user')
    router.push('/login')
  }

  return (
    <>
      {/* ════════════════ DESKTOP VIEW (lg+) ════════════════ */}
      <div className="hidden lg:block min-h-screen bg-[#f8fafc]">
        <Header title={t('hdr_dashboard')} subtitle={t('hdr_dashboard_sub')} role="seller" />

        <div className="p-6 space-y-5">

          {/* Period selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(['all','today','yesterday','this_week','last_week','this_month','last_month','this_year'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  period === p
                    ? 'bg-[#1a1c3a] text-white shadow-sm'
                    : 'bg-white border border-gray-100 text-gray-500 hover:border-gray-200'
                )}
              >
                {t(periodKeyMap[p])}
              </button>
            ))}
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {[
              { label: t('kpi_total_orders'),     value: desktopStats.total.toLocaleString(),       sub: t(periodKeyMap[period]),                                          icon: Package,     color: 'text-[#f4991a]',   bg: 'bg-orange-50'  },
              { label: t('kpi_confirmed_orders'), value: desktopStats.confirmed.toLocaleString(),   sub: `${desktopStats.confirmRate}% ${t('kpi_confirm_rate')}`,          icon: CheckCircle, color: 'text-blue-600',    bg: 'bg-blue-50'    },
              { label: t('kpi_delivered_orders'), value: desktopStats.delivered.toLocaleString(),   sub: `${desktopStats.deliveryRate}% ${t('kpi_delivery_rate')}`,        icon: Truck,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: t('kpi_returned_orders'),  value: desktopStats.returned.toLocaleString(),    sub: `${desktopStats.returnRate}% ${t('kpi_return_rate')}`,            icon: RotateCcw,   color: 'text-red-500',     bg: 'bg-red-50'     },
              { label: t('kpi_pending_orders'),   value: desktopStats.pending.toLocaleString(),     sub: t('kpi_awaiting'),                                                icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50'   },
              { label: t('kpi_total_revenue'),    value: `KES ${desktopStats.revenue.toLocaleString()}`, sub: t('kpi_from_delivered'),                                     icon: CreditCard,  color: 'text-teal-600',    bg: 'bg-teal-50'    },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-3', s.bg)}>
                  <s.icon size={20} className={s.color} />
                </div>
                <div className="text-2xl font-bold text-[#1a1c3a] mb-0.5">{s.value}</div>
                <div className="text-xs font-semibold text-gray-500">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-[#1a1c3a]">{t('dash_revenue_trend')}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{t('dash_revenue_sub')}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f4991a" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#f4991a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} formatter={(v: number) => [`KES ${v.toLocaleString()}`, t('dash_revenue')]} />
                  <Area type="monotone" dataKey="revenue" stroke="#f4991a" strokeWidth={2.5} fill="url(#rg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-base font-bold text-[#1a1c3a] mb-1">{t('dash_order_status')}</h2>
              <p className="text-xs text-gray-400 mb-4">{t('dash_distribution')} · {t(periodKeyMap[period])}</p>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value">
                    {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}%`, '']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {statusPie.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Shipedo payouts banner */}
          {payoutSummary.count > 0 && (
            <Link href="/seller/invoices" className="block">
              <div className="bg-gradient-to-r from-[#1a1c3a] via-[#1f2147] to-[#1a1c3a] rounded-2xl p-5 text-white shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#f4991a]/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#f4991a] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 flex-shrink-0">
                      <Sparkles size={22} className="text-white" />
                    </div>
                    <div>
                      <div className="text-white/50 text-[10px] uppercase tracking-widest font-bold">{t('dash_credited_by_shipedo')}</div>
                      <div className="text-2xl font-bold tracking-tight mt-0.5">
                        {payoutSummary.currency} <span className="text-[#f4991a]">{payoutSummary.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="text-white/50 text-xs mt-0.5">
                        {payoutSummary.count} {payoutSummary.count === 1 ? t('dash_payout_one') : t('dash_payout_many')}
                        {payoutSummary.last && ` · ${t('dash_last')} ${formatDateShort(payoutSummary.last.sent_at)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[#f4991a] text-xs font-bold">
                    {t('dash_view_statements')}
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('nav_new_order'), desc: t('dash_add_new_order'),                                icon: Plus,      color: 'text-[#f4991a]',   bg: 'bg-orange-50',  href: '/seller/orders/new'   },
              { label: t('dash_pending'),  desc: `${desktopStats.pending} ${t('dash_n_awaiting')}`,      icon: Phone,     color: 'text-blue-600',    bg: 'bg-blue-50',    href: '/seller/orders'       },
              { label: t('dash_wallet'),   desc: t('dash_view_transactions'),                            icon: Wallet,    color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/seller/transactions' },
              { label: t('dash_returns'),  desc: `${desktopStats.returned} ${t('dash_n_orders')}`,       icon: RotateCcw, color: 'text-red-500',     bg: 'bg-red-50',     href: '/seller/orders'       },
            ].map(a => (
              <Link key={a.label} href={a.href} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', a.bg)}>
                  <a.icon size={19} className={a.color} />
                </div>
                <div className="text-sm font-bold text-[#1a1c3a] mb-0.5">{a.label}</div>
                <div className="text-xs text-gray-400">{a.desc}</div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-[#f4991a] mt-3 transition-colors" />
              </Link>
            ))}
          </div>

          {/* Recent orders table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <div>
                <h2 className="text-base font-bold text-[#1a1c3a]">{t('dash_recent_orders')}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{t('dash_latest_activity')}</p>
              </div>
              <Link href="/seller/orders" className="text-[#f4991a] text-xs font-semibold hover:underline flex items-center gap-1">
                {t('view_all')} <ArrowRight size={12} />
              </Link>
            </div>
            {loading ? (
              <div className="py-16 flex flex-col items-center text-gray-300">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-[#f4991a] rounded-full animate-spin mb-2" />
                <p className="text-xs">{t('loading')}</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-16 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                  <ShoppingBag size={22} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 font-semibold">{t('dash_no_orders')}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{t('dash_no_orders_sub')}</p>
                <Link href="/seller/orders/new" className="mt-4 bg-[#f4991a] text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5">
                  <Plus size={13} /> {t('nav_new_order')}
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      {([
                        { key: 'nav_orders' as TKey, hideSm: false },
                        { key: 'customer'  as TKey, hideSm: false },
                        { key: 'city'      as TKey, hideSm: true  },
                        { key: 'amount'    as TKey, hideSm: false },
                        { key: 'status'    as TKey, hideSm: false },
                        { key: 'date'      as TKey, hideSm: true  },
                      ]).map(h => (
                        <th key={h.key} className={cn(
                          'text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 first:px-6',
                          h.hideSm && 'hidden lg:table-cell',
                        )}>{t(h.key)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.slice(0, 8).map(order => (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/seller/orders/${order.id}`)}
                      >
                        <td className="px-6 py-3.5">
                          <div className="text-xs font-mono font-semibold text-[#1a1c3a]">{order.tracking_number}</div>
                          <div className="text-[10px] text-gray-400">{order.payment_method || 'COD'}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                              {(order.customer_name || 'C')[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[#1a1c3a] truncate">{order.customer_name || t('customer')}</div>
                              <div className="text-[10px] text-gray-400">{order.customer_phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <span className="text-xs text-gray-600">{order.customer_city || '—'}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-semibold text-[#1a1c3a]">KES {(order.total_amount || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={(order.status || 'pending') as OrderStatus} />
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <span className="text-xs text-gray-400">{formatDateShort(order.created_at)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ════════════════ MOBILE VIEW (< lg) ════════════════ */}
      <div className="lg:hidden min-h-screen bg-[#f6f7fb] pb-24">
        {/* Top bar */}
        <div className="bg-gradient-to-br from-[#1a1c3a] via-[#1f2147] to-[#1a1c3a] px-5 pt-5 pb-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f4991a] rounded-full blur-3xl opacity-10" />

          <div className="relative flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#f4991a] to-orange-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-orange-500/30">
                {(userName || 'S')[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white/50 text-[11px]">{t('dash_welcome')}</p>
                <p className="text-white font-bold text-sm leading-tight truncate max-w-[160px]">{userName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-white/15 transition-all relative">
                <Bell size={17} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#f4991a] rounded-full" />
              </button>
              <button onClick={handleLogout} className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-white/15 transition-all">
                <LogOut size={16} />
              </button>
            </div>
          </div>

          <div className="relative">
            <p className="text-white/50 text-[11px] uppercase tracking-wider font-semibold">{t('dash_revenue')} · {t(mobilePeriodKeyMap[mobilePeriod])}</p>
            <p className="text-white text-3xl font-bold mt-1">KES {mRevenue.toLocaleString()}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-400/20 rounded-full px-2 py-0.5">
                <TrendingUp size={10} className="text-emerald-400" />
                <span className="text-emerald-400 text-[10px] font-bold">{mConfirmRate}% {t('dash_confirmed_pct')}</span>
              </div>
              <span className="text-white/40 text-[11px]">{mDelivered} {t('dash_delivered')}</span>
            </div>
          </div>
        </div>

        {/* Period switcher */}
        <div className="px-5 -mt-12 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl shadow-[#1a1c3a]/10 p-1 flex">
            {(['today','week','month','all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setMobilePeriod(p)}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                  mobilePeriod === p
                    ? 'bg-gradient-to-br from-[#1a1c3a] to-[#252750] text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t(mobilePeriodKeyMap[p])}
              </button>
            ))}
          </div>
        </div>

        {/* Stats grid */}
        <div className="px-5 mt-4 grid grid-cols-2 gap-3">
          {[
            { label: t('kpi_total_orders'),      value: mTotal,     icon: Package,     color: 'text-[#f4991a]',   bg: 'bg-orange-50',  ring: 'ring-orange-100'  },
            { label: t('dash_status_delivered'), value: mDelivered, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
            { label: t('dash_pending'),          value: mPending,   icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-100'   },
            { label: t('dash_status_returned'),  value: mReturned,  icon: RotateCcw,   color: 'text-red-500',     bg: 'bg-red-50',     ring: 'ring-red-100'     },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 ring-1 ring-gray-100 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${s.bg} ring-1 ${s.ring} flex items-center justify-center mb-2.5`}>
                <s.icon size={16} className={s.color} />
              </div>
              <p className="text-[#0f1129] text-2xl font-bold leading-none">{s.value}</p>
              <p className="text-gray-400 text-[11px] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="px-5 mt-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 px-1">{t('dash_quick_actions')}</p>
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: t('nav_new_order'),  icon: Plus,        href: '/seller/orders/new',   color: 'bg-gradient-to-br from-[#f4991a] to-orange-600 text-white shadow-md shadow-orange-500/20' },
              { label: t('nav_orders'),     icon: ShoppingBag, href: '/seller/orders',       color: 'bg-white text-[#1a1c3a] ring-1 ring-gray-100' },
              { label: t('nav_products'),   icon: Package,     href: '/seller/products',     color: 'bg-white text-[#1a1c3a] ring-1 ring-gray-100' },
              { label: t('nav_my_wallet'),  icon: Wallet,      href: '/seller/transactions', color: 'bg-white text-[#1a1c3a] ring-1 ring-gray-100' },
            ].map(a => (
              <Link key={a.label} href={a.href} className={`${a.color} rounded-2xl py-3.5 flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}>
                <a.icon size={18} />
                <span className="text-[10px] font-bold">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="px-5 mt-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('dash_recent_orders')}</p>
            <Link href="/seller/orders" className="text-[#f4991a] text-[11px] font-bold flex items-center gap-1">
              {t('see_all')} <ArrowRight size={11} />
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl ring-1 ring-gray-100 py-12 flex flex-col items-center text-gray-300">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-[#f4991a] rounded-full animate-spin mb-2" />
              <p className="text-xs">{t('loading')}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-gray-100 py-12 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <ShoppingBag size={22} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 font-semibold">{t('dash_no_orders')}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{t('dash_no_orders_sub')}</p>
              <Link href="/seller/orders/new" className="mt-4 bg-[#f4991a] text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform">
                <Plus size={13} /> {t('nav_new_order')}
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {orders.slice(0, 5).map(order => {
                const cfg = statusColors[order.status] || statusColors.pending
                return (
                  <Link
                    key={order.id}
                    href={`/seller/orders/${order.id}`}
                    className="bg-white rounded-2xl ring-1 ring-gray-100 p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center text-sm font-bold text-[#f4991a] flex-shrink-0">
                      {(order.customer_name || 'C')[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-bold text-[#0f1129] truncate">{order.customer_name || t('customer')}</p>
                      </div>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">{order.tracking_number}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#0f1129]">KES {(order.total_amount||0).toLocaleString()}</p>
                      <span className={`inline-flex items-center gap-1 mt-1 ${cfg.bg} ${cfg.text} text-[9px] font-bold px-2 py-0.5 rounded-full`}>
                        <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                        {order.status}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 flex items-center justify-around z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] lg:hidden">
          {[
            { label: t('nav_home'),     icon: Package,     href: '/seller',              active: true  },
            { label: t('nav_orders'),   icon: ShoppingBag, href: '/seller/orders',       active: false },
            { label: t('nav_add'),      icon: Plus,        href: '/seller/orders/new',   active: false, primary: true },
            { label: t('nav_products'), icon: Truck,       href: '/seller/products',     active: false },
            { label: t('nav_profile'),  icon: Eye,         href: '/seller/profile',      active: false },
          ].map(item => item.primary ? (
            <Link key={item.label} href={item.href} className="-mt-7 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f4991a] to-orange-600 flex items-center justify-center text-white shadow-xl shadow-orange-500/30 active:scale-95 transition-transform">
              <item.icon size={22} strokeWidth={2.5} />
            </Link>
          ) : (
            <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${item.active ? 'text-[#f4991a]' : 'text-gray-400'}`}>
              <item.icon size={18} />
              <span className="text-[9px] font-bold">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
