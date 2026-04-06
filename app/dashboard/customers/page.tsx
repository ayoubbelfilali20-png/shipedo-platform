'use client'

import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import { mockCustomers } from '@/lib/data'
import { formatDate } from '@/lib/utils'
import { Search, Users, ShoppingBag, TrendingUp, Phone, MapPin, Mail } from 'lucide-react'

export default function CustomersPage() {
  const [search, setSearch] = useState('')

  const filtered = mockCustomers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.city.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      <Header
        title="Customers"
        subtitle={`${mockCustomers.length} customers in database`}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Customers', value: mockCustomers.length, icon: Users, color: 'text-[#f4991a]', bg: 'bg-orange-50' },
            { label: 'Total Orders', value: mockCustomers.reduce((a, c) => a + c.totalOrders, 0), icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Spent', value: `KES ${(mockCustomers.reduce((a, c) => a + c.totalSpent, 0) / 1000).toFixed(0)}K`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className={`${s.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div className="text-2xl font-bold text-[#1a1c3a]">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search & Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers by name, phone, or city..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Location</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Orders</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Total Spent</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden xl:table-cell">Last Order</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((customer) => (
                  <tr key={customer.id} className="table-row-hover cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-sm font-bold text-[#1a1c3a] flex-shrink-0">
                          {customer.name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#1a1c3a]">{customer.name}</div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Phone size={11} />
                            {customer.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <MapPin size={13} className="text-gray-400" />
                        {customer.city}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#1a1c3a]">{customer.totalOrders}</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: Math.min(customer.totalOrders, 5) }).map((_, i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#f4991a]" />
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-sm font-semibold text-emerald-600">
                        KES {customer.totalSpent.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden xl:table-cell">
                      <span className="text-xs text-gray-400">{formatDate(customer.lastOrderAt)}</span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-xs text-gray-400">{formatDate(customer.createdAt)}</span>
                    </td>
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
