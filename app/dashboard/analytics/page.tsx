'use client'

import Header from '@/components/dashboard/Header'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import { revenueChartData, orderStatusData } from '@/lib/data'
import { TrendingUp, Package, Truck, RotateCcw, CreditCard, Users } from 'lucide-react'

const cityData = [
  { city: 'Nairobi', orders: 142, revenue: 524000 },
  { city: 'Mombasa', orders: 38, revenue: 148000 },
  { city: 'Kisumu', orders: 24, revenue: 89000 },
  { city: 'Nakuru', orders: 19, revenue: 71000 },
  { city: 'Eldoret', orders: 15, revenue: 52000 },
  { city: 'Other', orders: 10, revenue: 38000 },
]

const weeklyOrders = [
  { day: 'Mon', orders: 32, delivered: 28 },
  { day: 'Tue', orders: 45, delivered: 39 },
  { day: 'Wed', orders: 38, delivered: 33 },
  { day: 'Thu', orders: 52, delivered: 44 },
  { day: 'Fri', orders: 61, delivered: 51 },
  { day: 'Sat', orders: 48, delivered: 40 },
  { day: 'Sun', orders: 22, delivered: 19 },
]

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen">
      <Header title="Analytics" subtitle="Performance insights & delivery metrics" />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: 'Total Revenue', value: 'KES 892K', change: '+18%', positive: true, icon: CreditCard, color: 'text-[#f4991a]', bg: 'bg-orange-50' },
            { label: 'Total Orders', value: '248', change: '+12%', positive: true, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Delivered', value: '209', change: '+15%', positive: true, icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Returned', value: '21', change: '-3%', positive: false, icon: RotateCcw, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Delivery Rate', value: '84.2%', change: '+2.1%', positive: true, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Active Sellers', value: '24', change: '+4', positive: true, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className={`${kpi.bg} w-9 h-9 rounded-xl flex items-center justify-center mb-3`}>
                <kpi.icon size={18} className={kpi.color} />
              </div>
              <div className="text-xl font-bold text-[#1a1c3a]">{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
              <div className={`text-xs font-semibold mt-1 ${kpi.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.change} this month
              </div>
            </div>
          ))}
        </div>

        {/* Revenue + Orders charts */}
        <div className="grid xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#1a1c3a] mb-1">Revenue Trend</h2>
            <p className="text-xs text-gray-400 mb-5">Monthly revenue (KES)</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f4991a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f4991a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}K`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(v: number) => [`KES ${v.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f4991a" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#1a1c3a] mb-1">Weekly Orders vs Delivered</h2>
            <p className="text-xs text-gray-400 mb-5">This week's performance</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyOrders} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                <Bar dataKey="orders" name="Orders" fill="#1a1c3a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delivered" name="Delivered" fill="#f4991a" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City breakdown + order status */}
        <div className="grid xl:grid-cols-2 gap-6">
          {/* City breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#1a1c3a] mb-4">Orders by City</h2>
            <div className="space-y-3">
              {cityData.map((city) => {
                const maxOrders = Math.max(...cityData.map(c => c.orders))
                const pct = (city.orders / maxOrders) * 100
                return (
                  <div key={city.city}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-[#1a1c3a]">{city.city}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{city.orders} orders</span>
                        <span className="text-xs font-semibold text-[#1a1c3a]">KES {(city.revenue/1000).toFixed(0)}K</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#f4991a] to-orange-300 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Order status donut */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#1a1c3a] mb-4">Order Status Breakdown</h2>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {orderStatusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-[#1a1c3a]">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
