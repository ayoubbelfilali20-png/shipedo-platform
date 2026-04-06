'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/dashboard/Header'
import { mockExpeditions } from '@/lib/data'
import { Expedition, ExpeditionStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import {
  PlaneTakeoff, Ship, Package, Clock, CheckCircle, AlertTriangle,
  Search, Plus, Eye, ArrowRight, Globe, ChevronRight, X,
  MapPin, Truck, Box, DollarSign, Calendar, FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'

const statusConfig: Record<ExpeditionStatus, { label: string; color: string; bg: string; border: string; dot: string; icon: React.ElementType }> = {
  preparing:    { label: 'Preparing',    color: 'text-gray-600',    bg: 'bg-gray-50',    border: 'border-gray-200',    dot: 'bg-gray-400',    icon: Box },
  in_transit:   { label: 'In Transit',   color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500',    icon: PlaneTakeoff },
  customs:      { label: 'Customs',      color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-200',  dot: 'bg-yellow-500',  icon: AlertTriangle },
  arrived:      { label: 'Arrived',      color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200',  dot: 'bg-purple-500',  icon: MapPin },
  distributing: { label: 'Distributing', color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  dot: 'bg-[#f4991a]',   icon: Truck },
  completed:    { label: 'Completed',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  delayed:      { label: 'Delayed',      color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-500',     icon: Clock },
}

const originFlag: Record<string, string> = {
  China: '🇨🇳',
  Dubai: '🇦🇪',
  Turkey: '🇹🇷',
  India: '🇮🇳',
  Local: '🇰🇪',
}

function StatusBadge({ status }: { status: ExpeditionStatus }) {
  const s = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border', s.color, s.bg, s.border)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  )
}

function DetailModal({ exp, onClose }: { exp: Expedition; onClose: () => void }) {
  const s = statusConfig[exp.status]
  const totalLanded = exp.totalCost + exp.shippingCost + exp.customsFee

  const steps: { key: ExpeditionStatus; label: string }[] = [
    { key: 'preparing', label: 'Preparing' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'customs', label: 'Customs' },
    { key: 'arrived', label: 'Arrived' },
    { key: 'distributing', label: 'Distributing' },
    { key: 'completed', label: 'Completed' },
  ]
  const stepOrder = steps.map(s => s.key)
  const currentStep = stepOrder.indexOf(exp.status === 'delayed' ? 'in_transit' : exp.status)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        {/* Header */}
        <div className="bg-[#1a1c3a] rounded-t-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{originFlag[exp.origin]}</span>
                <span className="text-white font-mono font-bold text-lg">{exp.reference}</span>
              </div>
              <div className="text-white/50 text-sm">{exp.originCity} → {exp.destination}</div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={exp.status} />
              <button onClick={onClose} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all">
                <X size={16} className="text-white" />
              </button>
            </div>
          </div>

          {/* Progress tracker */}
          <div className="mt-6">
            <div className="flex items-center gap-0">
              {steps.map((step, i) => {
                const done = i < currentStep
                const active = i === currentStep
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                        done    ? 'bg-emerald-500 border-emerald-500 text-white' :
                        active  ? 'bg-[#f4991a] border-[#f4991a] text-white scale-110' :
                                  'bg-white/10 border-white/20 text-white/30'
                      )}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span className={cn('text-[9px] font-semibold whitespace-nowrap', active ? 'text-[#f4991a]' : done ? 'text-emerald-400' : 'text-white/30')}>
                        {step.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={cn('flex-1 h-0.5 mb-4 mx-1', i < currentStep ? 'bg-emerald-500' : 'bg-white/10')} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Key info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Carrier', value: exp.carrier, icon: PlaneTakeoff },
              { label: 'Tracking', value: exp.trackingNumber || '—', icon: FileText },
              { label: 'ETA', value: formatDate(exp.estimatedArrival), icon: Calendar },
              { label: 'Total Items', value: exp.totalItems.toString(), icon: Box },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <item.icon size={13} className="text-gray-400" />
                  <span className="text-xs text-gray-400">{item.label}</span>
                </div>
                <div className="text-sm font-semibold text-[#1a1c3a] truncate">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Products */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Products</div>
            <div className="space-y-2">
              {exp.products.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package size={15} className="text-[#f4991a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1a1c3a]">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.sellerName} · SKU: {p.sku}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-[#1a1c3a]">{p.quantity} units</div>
                    <div className="text-xs text-gray-400">KES {(p.unitCost * p.quantity).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost breakdown */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Cost Breakdown</div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {[
                { label: 'Goods Cost', value: exp.totalCost },
                { label: 'Shipping Cost', value: exp.shippingCost },
                { label: 'Customs & Fees', value: exp.customsFee },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{r.label}</span>
                  <span className="text-[#1a1c3a]">KES {r.value.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-bold text-[#1a1c3a]">Total Landed Cost</span>
                <span className="font-bold text-[#f4991a]">KES {totalLanded.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {exp.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
              <span className="font-semibold">Notes: </span>{exp.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ExpeditionsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ExpeditionStatus | 'all'>('all')
  const [selected, setSelected] = useState<Expedition | null>(null)

  const filtered = mockExpeditions.filter(exp => {
    const matchSearch =
      exp.reference.toLowerCase().includes(search.toLowerCase()) ||
      exp.origin.toLowerCase().includes(search.toLowerCase()) ||
      exp.originCity.toLowerCase().includes(search.toLowerCase()) ||
      exp.carrier.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || exp.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total: mockExpeditions.length,
    inTransit: mockExpeditions.filter(e => e.status === 'in_transit').length,
    customs: mockExpeditions.filter(e => e.status === 'customs').length,
    totalValue: mockExpeditions.reduce((a, e) => a + e.totalCost + e.shippingCost + e.customsFee, 0),
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Expeditions"
        subtitle={`${mockExpeditions.length} expeditions tracked`}
        action={{ label: 'New Expedition', href: '/dashboard/expeditions/new' }}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Expeditions', value: stats.total, icon: Globe, color: 'text-[#f4991a]', bg: 'bg-orange-50' },
            { label: 'In Transit', value: stats.inTransit, icon: PlaneTakeoff, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'At Customs', value: stats.customs, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Total Value', value: `KES ${(stats.totalValue / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover">
              <div className={`${s.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div className="text-2xl font-bold text-[#1a1c3a]">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Active expeditions — card view */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#1a1c3a]">Active Expeditions</h2>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mockExpeditions.filter(e => e.status !== 'completed').map(exp => {
              const s = statusConfig[exp.status]
              const totalLanded = exp.totalCost + exp.shippingCost + exp.customsFee
              return (
                <div
                  key={exp.id}
                  onClick={() => setSelected(exp)}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-hover cursor-pointer group"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{originFlag[exp.origin]}</span>
                      <div>
                        <div className="font-mono font-bold text-[#1a1c3a] text-sm">{exp.reference}</div>
                        <div className="text-xs text-gray-400">{exp.originCity} → Nairobi</div>
                      </div>
                    </div>
                    <StatusBadge status={exp.status} />
                  </div>

                  {/* Products preview */}
                  <div className="space-y-1.5 mb-4">
                    {exp.products.slice(0, 2).map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Package size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600 truncate">{p.name}</span>
                        </div>
                        <span className="text-gray-500 flex-shrink-0 ml-2">{p.quantity} units</span>
                      </div>
                    ))}
                    {exp.products.length > 2 && (
                      <div className="text-xs text-gray-400">+{exp.products.length - 2} more products</div>
                    )}
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div>
                      <div className="text-xs text-gray-400">Landed Cost</div>
                      <div className="text-sm font-bold text-[#f4991a]">KES {totalLanded.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">ETA</div>
                      <div className="text-xs font-semibold text-[#1a1c3a]">{formatDate(exp.estimatedArrival)}</div>
                    </div>
                    <ArrowRight size={16} className="text-gray-300 group-hover:text-[#f4991a] transition-colors" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* All Expeditions Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by reference, origin, carrier..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {(['all', 'preparing', 'in_transit', 'customs', 'arrived', 'completed'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={cn(
                      'flex-shrink-0 px-3 py-2 text-xs font-semibold rounded-xl transition-all',
                      statusFilter === f ? 'bg-[#1a1c3a] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    )}
                  >
                    {f === 'all' ? 'All' : statusConfig[f as ExpeditionStatus]?.label ?? f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Reference</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Origin</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Products</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Carrier</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Landed Cost</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden xl:table-cell">ETA</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(exp => (
                  <tr key={exp.id} className="table-row-hover">
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm font-bold text-[#1a1c3a]">{exp.reference}</div>
                      <div className="text-xs text-gray-400">{exp.trackingNumber || 'No tracking yet'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{originFlag[exp.origin]}</span>
                        <div>
                          <div className="text-sm font-semibold text-[#1a1c3a]">{exp.origin}</div>
                          <div className="text-xs text-gray-400">{exp.originCity}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-sm text-[#1a1c3a]">{exp.totalItems} items</div>
                      <div className="text-xs text-gray-400">{exp.products.length} SKU(s)</div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-xs text-gray-600">{exp.carrier}</span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-sm font-semibold text-[#f4991a]">
                        KES {(exp.totalCost + exp.shippingCost + exp.customsFee).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={exp.status} />
                    </td>
                    <td className="px-4 py-4 hidden xl:table-cell">
                      <span className="text-xs text-gray-400">{formatDate(exp.estimatedArrival)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setSelected(exp)}
                        className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-orange-50 flex items-center justify-center text-gray-400 hover:text-[#f4991a] transition-all"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && <DetailModal exp={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
