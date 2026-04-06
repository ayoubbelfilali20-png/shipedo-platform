'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import StatusBadge from '@/components/dashboard/StatusBadge'
import {
  Package, CheckCircle, RotateCcw, Phone, CreditCard,
  ArrowRight, ChevronDown, Calendar, ChevronUp, Truck,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { mockOrders, revenueChartData, orderStatusData } from '@/lib/data'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Period = 'all' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'between'

const periodLabels: Record<Period, string> = {
  all: 'All Time', today: 'Today', yesterday: 'Yesterday',
  this_week: 'This Week', last_week: 'Last Week',
  this_month: 'This Month', last_month: 'Last Month',
  this_year: 'This Year', between: 'Between',
}

const statsData: Record<Period, { total: number; confirmed: number; delivered: number; returned: number; rate: number; revenue: number }> = {
  all:        { total: 87,  confirmed: 74,  delivered: 69,  returned: 8,  rate: 85.1, revenue: 342800 },
  today:      { total: 6,   confirmed: 4,   delivered: 3,   returned: 0,  rate: 66.7, revenue: 14200  },
  yesterday:  { total: 8,   confirmed: 7,   delivered: 6,   returned: 1,  rate: 87.5, revenue: 28900  },
  this_week:  { total: 31,  confirmed: 26,  delivered: 24,  returned: 3,  rate: 83.9, revenue: 98400  },
  last_week:  { total: 28,  confirmed: 24,  delivered: 22,  returned: 2,  rate: 85.7, revenue: 87200  },
  this_month: { total: 87,  confirmed: 74,  delivered: 69,  returned: 8,  rate: 85.1, revenue: 342800 },
  last_month: { total: 72,  confirmed: 62,  delivered: 58,  returned: 7,  rate: 86.1, revenue: 284300 },
  this_year:  { total: 312, confirmed: 265, delivered: 248, returned: 28, rate: 84.9, revenue: 1124000},
  between:    { total: 0,   confirmed: 0,   delivered: 0,   returned: 0,  rate: 0,    revenue: 0      },
}

function PeriodDropdown({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const label = value === 'between' && from && to ? `${from} → ${to}` : periodLabels[value]

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-4 py-2 bg-[#1a1c3a] text-white text-xs font-semibold rounded-xl hover:bg-[#252750] transition-all">
        <Calendar size={14} /> {label}
        <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-2xl z-50 overflow-hidden">
          <div className="p-2 space-y-0.5">
            {(['all','today','yesterday','this_week','last_week','this_month','last_month','this_year'] as Period[]).map(p => (
              <button key={p} onClick={() => { onChange(p); setOpen(false) }}
                className={cn('w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all',
                  value === p ? 'bg-[#f4991a]/10 text-[#f4991a] font-semibold' : 'text-gray-600 hover:bg-gray-50'
                )}>
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 p-3">
            <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Between (manual)</div>
            <div className="space-y-2">
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]" />
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]" />
              <button disabled={!from || !to} onClick={() => { onChange('between'); setOpen(false) }}
                className="w-full py-2 bg-[#f4991a] disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all">
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon, iconColor, iconBg, positive, arrow }: {
  label: string; value: string; sub: string
  icon: React.ElementType; iconColor: string; iconBg: string
  positive?: boolean; arrow?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
        {arrow && (
          <div className={cn('flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full',
            positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          )}>
            {positive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {arrow}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-[#1a1c3a] mb-0.5">{value}</div>
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  )
}

const sellerOrders = mockOrders.filter(o => o.sellerId === 'sel-001')

export default function SellerDashboard() {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('this_month')
  const s = statsData[period]
  const confirmRate = s.total > 0 ? ((s.confirmed / s.total) * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header
        title="Dashboard"
        subtitle="Your store overview"
        action={{ label: 'New Order', href: '/seller/orders/new' }}
        role="seller"
      />

      <div className="p-6 space-y-5">

        {/* ── Period bar ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
            {(['all','today','yesterday','this_week','last_week','this_month','last_month','this_year'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn('flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  period === p ? 'bg-[#1a1c3a] text-white shadow-sm' : 'bg-white border border-gray-100 text-gray-500 hover:border-gray-200'
                )}>
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <PeriodDropdown value={period} onChange={setPeriod} />
        </div>

        {/* ── 6 KPIs ── */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard label="Total Orders"      value={s.total.toLocaleString()}      sub={periodLabels[period]}                                                    icon={Package}     iconColor="text-[#f4991a]"   iconBg="bg-orange-50"  arrow="+12%" positive />
          <StatCard label="Confirmed Orders"  value={s.confirmed.toLocaleString()}  sub={`${confirmRate}% confirmation rate`}                                     icon={CheckCircle} iconColor="text-blue-600"    iconBg="bg-blue-50"    arrow="+8%"  positive />
          <StatCard label="Delivered Orders"  value={s.delivered.toLocaleString()}  sub={`${s.total > 0 ? ((s.delivered/s.total)*100).toFixed(1) : 0}% rate`}   icon={Truck}       iconColor="text-emerald-600" iconBg="bg-emerald-50" arrow="+15%" positive />
          <StatCard label="Returned Orders"   value={s.returned.toLocaleString()}   sub={`${s.total > 0 ? ((s.returned/s.total)*100).toFixed(1) : 0}% rate`}    icon={RotateCcw}   iconColor="text-red-500"     iconBg="bg-red-50"     arrow="-3%"  positive={false} />
          <StatCard label="Confirmation Rate" value={`${confirmRate}%`}             sub="Orders confirmed by call center"                                         icon={Phone}       iconColor="text-purple-600"  iconBg="bg-purple-50"  arrow="+2.1%" positive />
          <StatCard label="Total Revenue"     value={`KES ${s.revenue > 0 ? (s.revenue/1000).toFixed(0)+'K' : '0'}`} sub="Cash on delivery collected"           icon={CreditCard}  iconColor="text-teal-600"    iconBg="bg-teal-50"    arrow="+18%" positive />
        </div>

        {/* ── Charts ── */}
        <div className="grid xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-[#1a1c3a]">Revenue Trend</h2>
                <p className="text-xs text-gray-400 mt-0.5">Monthly revenue overview</p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-1 rounded-full">+18% vs last year</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f4991a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f4991a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}K`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} formatter={(v: number) => [`KES ${v.toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#f4991a" strokeWidth={2.5} fill="url(#rg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#1a1c3a] mb-1">Order Status</h2>
            <p className="text-xs text-gray-400 mb-4">Distribution breakdown</p>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value">
                  {orderStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={v => [`${v}%`, '']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {orderStatusData.map(item => (
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

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'New Order',   desc: 'Add a new order',    icon: Package,    color: 'text-[#f4991a]',    bg: 'bg-orange-50',  href: '/seller/orders/new'    },
            { label: 'Pending',     desc: `${s.total - s.confirmed} awaiting`,  icon: Phone,      color: 'text-blue-600',    bg: 'bg-blue-50',    href: '/seller/orders'        },
            { label: 'COD',         desc: 'KES pending',        icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/seller/transactions'   },
            { label: 'Returns',     desc: `${s.returned} orders`,icon: RotateCcw, color: 'text-red-500',     bg: 'bg-red-50',     href: '/seller/orders'        },
          ].map(a => (
            <Link key={a.label} href={a.href} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group">
              <div className={`${a.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}><a.icon size={19} className={a.color} /></div>
              <div className="text-sm font-bold text-[#1a1c3a] mb-0.5">{a.label}</div>
              <div className="text-xs text-gray-400">{a.desc}</div>
              <ArrowRight size={14} className="text-gray-300 group-hover:text-[#f4991a] mt-3 transition-colors" />
            </Link>
          ))}
        </div>

        {/* ── Recent orders ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div>
              <h2 className="text-base font-bold text-[#1a1c3a]">Recent Orders</h2>
              <p className="text-xs text-gray-400 mt-0.5">Latest activity</p>
            </div>
            <Link href="/seller/orders" className="text-[#f4991a] text-xs font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  {['Order','Customer','City','Amount','Status','Date'].map(h => (
                    <th key={h} className={cn('text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 first:px-6',
                      ['City','Date'].includes(h) && 'hidden lg:table-cell',
                      h === 'Amount' && 'hidden md:table-cell'
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sellerOrders.slice(0, 6).map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/50 cursor-pointer transition-colors" onClick={() => router.push(`/seller/orders/${order.id}`)}>
                    <td className="px-6 py-3.5">
                      <div className="text-xs font-mono font-semibold text-[#1a1c3a]">{order.trackingNumber}</div>
                      <div className="text-xs text-gray-400">{order.paymentMethod}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                          {order.customerName[0]}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[#1a1c3a]">{order.customerName}</div>
                          <div className="text-xs text-gray-400">{order.customerPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell"><span className="text-xs text-gray-600">{order.customerCity}</span></td>
                    <td className="px-4 py-3.5 hidden md:table-cell"><span className="text-xs font-semibold text-[#1a1c3a]">KES {order.totalAmount.toLocaleString()}</span></td>
                    <td className="px-4 py-3.5"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3.5 hidden lg:table-cell"><span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
