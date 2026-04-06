'use client'

import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import { mockInventory } from '@/lib/data'
import {
  Warehouse, Package, AlertTriangle, CheckCircle, Search,
  TrendingDown, ArrowRight, Box, BarChart3, MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function FulfillmentPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')

  const filtered = mockInventory.filter((item) => {
    const matchSearch = item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.sellerName.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || item.status === filter
    return matchSearch && matchFilter
  })

  const stats = {
    total: mockInventory.reduce((a, i) => a + i.quantity, 0),
    inStock: mockInventory.filter(i => i.status === 'in_stock').length,
    lowStock: mockInventory.filter(i => i.status === 'low_stock').length,
    outOfStock: mockInventory.filter(i => i.status === 'out_of_stock').length,
  }

  const statusConfig = {
    in_stock: { label: 'In Stock', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
    low_stock: { label: 'Low Stock', className: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', icon: AlertTriangle },
    out_of_stock: { label: 'Out of Stock', className: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500', icon: TrendingDown },
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Fulfillment"
        subtitle="Inventory & warehouse management"
        action={{ label: 'Add Stock', onClick: () => {} }}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Units', value: stats.total, icon: Box, color: 'text-[#f4991a]', bg: 'bg-orange-50' },
            { label: 'In Stock SKUs', value: stats.inStock, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Low Stock', value: stats.lowStock, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Out of Stock', value: stats.outOfStock, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover">
              <div className={`${s.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div className="text-2xl font-bold text-[#1a1c3a]">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Warehouse zones */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#1a1c3a] mb-4 flex items-center gap-2">
            <Warehouse size={18} className="text-[#f4991a]" />
            Warehouse Layout — Nairobi Hub
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { zone: 'Zone A', desc: 'Electronics & Tech', items: 2, capacity: '60%', color: 'bg-blue-50 border-blue-200' },
              { zone: 'Zone B', desc: 'Fashion & Apparel', items: 1, capacity: '35%', color: 'bg-purple-50 border-purple-200' },
              { zone: 'Zone C', desc: 'Health & Beauty', items: 1, capacity: '80%', color: 'bg-pink-50 border-pink-200' },
              { zone: 'Zone D', desc: 'Sports & Fitness', items: 1, capacity: '45%', color: 'bg-green-50 border-green-200' },
            ].map((z) => (
              <div key={z.zone} className={`${z.color} rounded-xl border p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="font-bold text-sm text-[#1a1c3a]">{z.zone}</span>
                </div>
                <div className="text-xs text-gray-500 mb-3">{z.desc}</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Capacity</span>
                    <span className="font-semibold text-[#1a1c3a]">{z.capacity}</span>
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-[#f4991a] to-orange-300 h-1.5 rounded-full"
                      style={{ width: z.capacity }}
                    />
                  </div>
                  <div className="text-xs text-gray-400">{z.items} SKU(s)</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h2 className="text-base font-bold text-[#1a1c3a]">Inventory</h2>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      filter === f ? 'bg-[#1a1c3a] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'in_stock' ? 'In Stock' : f === 'low_stock' ? 'Low' : 'Out'}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, SKU, or seller..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Product</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">SKU</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Location</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Available</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Reserved</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Seller</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((item) => {
                  const sc = statusConfig[item.status]
                  return (
                    <tr key={item.id} className="table-row-hover">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                            <Package size={16} className="text-gray-400" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[#1a1c3a]">{item.productName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">{item.sku}</span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin size={12} className="text-gray-400" />
                          {item.location}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          'text-lg font-bold',
                          item.quantity === 0 ? 'text-red-500' :
                          item.quantity < 10 ? 'text-yellow-600' : 'text-[#1a1c3a]'
                        )}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-sm text-gray-500">{item.reservedQuantity}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', sc.className)}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-xs text-gray-500">{item.sellerName}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Packaging Queue */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#1a1c3a] mb-4 flex items-center gap-2">
            <Box size={18} className="text-[#f4991a]" />
            Packaging Queue
          </h2>
          <div className="space-y-3">
            {[
              { id: 'SHP-KE-240003', product: 'Fashion Sneakers Size 42', seller: 'StyleKe', stage: 'Picking', progress: 40 },
              { id: 'SHP-KE-240006', product: 'Hijab Collection Set × 2', seller: 'ModestFashion', stage: 'Packing', progress: 70 },
              { id: 'SHP-KE-240007', product: 'Protein Powder 2kg', seller: 'FitStore Kenya', stage: 'Labeled', progress: 90 },
            ].map((pkg) => (
              <div key={pkg.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-[#1a1c3a]">{pkg.id}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{pkg.seller}</span>
                  </div>
                  <div className="text-sm text-gray-600 truncate">{pkg.product}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-[#f4991a] to-orange-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${pkg.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">{pkg.progress}%</span>
                  </div>
                </div>
                <span className={cn(
                  'text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0',
                  pkg.stage === 'Labeled' ? 'bg-emerald-50 text-emerald-700' :
                  pkg.stage === 'Packing' ? 'bg-blue-50 text-blue-700' :
                  'bg-yellow-50 text-yellow-700'
                )}>
                  {pkg.stage}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
