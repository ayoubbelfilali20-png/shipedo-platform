'use client'

import { useState } from 'react'
import { mockOrders } from '@/lib/data'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Phone, CheckCircle, XCircle, Calendar, PhoneOff,
  Search, X, TrendingUp, BarChart3, Clock, User, MapPin
} from 'lucide-react'

// Simulate call history from all orders
const history = mockOrders.map((o, i) => ({
  order: o,
  result: (['confirmed','not_reached','rescheduled','confirmed','confirmed','not_reached'] as const)[i % 6],
  agentNote: [
    'Customer confirmed delivery for tomorrow morning',
    'No answer after 3 rings',
    'Rescheduled to next week — customer traveling',
    'Confirmed — deliver between 2–5pm',
    'Address updated by customer',
    'Line busy',
  ][i % 6],
  calledAt: o.updatedAt,
}))

const resultConfig = {
  confirmed:   { label: 'Confirmed',   color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: CheckCircle },
  not_reached: { label: 'Not Reached', color: 'text-red-600',     bg: 'bg-red-50',      border: 'border-red-200',     icon: PhoneOff    },
  rescheduled: { label: 'Rescheduled', color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',    icon: Calendar    },
}

export default function AgentHistoryPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'not_reached' | 'rescheduled'>('all')

  const filtered = history.filter(h => {
    const q = search.toLowerCase()
    const matchSearch = h.order.trackingNumber.toLowerCase().includes(q) || h.order.customerName.toLowerCase().includes(q)
    const matchFilter = filter === 'all' || h.result === filter
    return matchSearch && matchFilter
  })

  const stats = {
    total:      history.length,
    confirmed:  history.filter(h => h.result === 'confirmed').length,
    notReached: history.filter(h => h.result === 'not_reached').length,
    rescheduled:history.filter(h => h.result === 'rescheduled').length,
  }
  const rate = stats.total > 0 ? ((stats.confirmed / stats.total) * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="font-bold text-[#1a1c3a] text-lg">Call History</h1>
        <p className="text-xs text-gray-400 mt-0.5">All your previous call results</p>
      </div>

      <div className="px-6 pt-5 pb-10 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Calls',       value: stats.total,      icon: Phone,       color: 'text-[#1a1c3a]',   bg: 'bg-white'       },
            { label: 'Confirmed',         value: stats.confirmed,  icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50'  },
            { label: 'Not Reached',       value: stats.notReached, icon: PhoneOff,    color: 'text-red-500',     bg: 'bg-red-50'      },
            { label: 'Confirmation Rate', value: `${rate}%`,       icon: TrendingUp,  color: 'text-[#f4991a]',   bg: 'bg-orange-50'   },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3`}>
              <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                <s.icon size={16} className={s.color} />
              </div>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search calls..."
              className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] shadow-sm"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300"><X size={13} /></button>}
          </div>
          <div className="flex items-center gap-1.5">
            {(['all','confirmed','not_reached','rescheduled'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filter === f ? 'bg-[#1a1c3a] text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
              >
                {f === 'not_reached' ? 'Not Reached' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* History list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  {['Order', 'Customer', 'Result', 'Note', 'Date'].map(h => (
                    <th key={h} className={cn('text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5 first:px-6', h === 'Note' && 'hidden lg:table-cell')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16 text-gray-400 text-sm">No calls found</td></tr>
                ) : filtered.map((h, i) => {
                  const cfg = resultConfig[h.result]
                  const Icon = cfg.icon
                  return (
                    <tr key={i} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-mono font-bold text-[#1a1c3a]">{h.order.trackingNumber}</p>
                        <p className="text-xs text-gray-400">{h.order.paymentMethod}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                            {h.order.customerName[0]}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#1a1c3a]">{h.order.customerName}</p>
                            <p className="text-xs text-gray-400">{h.order.customerCity}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border', cfg.color, cfg.bg, cfg.border)}>
                          <Icon size={11} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <p className="text-xs text-gray-500 max-w-[200px] truncate">{h.agentNote}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs text-gray-400">{formatDate(h.calledAt)}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
