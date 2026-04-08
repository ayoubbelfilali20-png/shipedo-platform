'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { decrementTotalQuantityForOrderItems } from '@/lib/stock'
import { cn } from '@/lib/utils'
import {
  Phone, CheckCircle, XCircle, Calendar, PhoneOff,
  Search, X, TrendingUp, Package, Truck, MapPin
} from 'lucide-react'

type OrderRow = {
  id: string
  tracking_number: string
  customer_name: string
  customer_phone: string
  customer_city: string
  customer_address: string
  items: any[]
  total_amount: number
  status: string
  notes?: string | null
  call_attempts?: number | null
  reminded_at?: string | null
  last_call_at?: string | null
  last_call_note?: string | null
  last_call_agent_id?: string | null
  created_at: string
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  confirmed: { label: 'Confirmed', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  prepared:  { label: 'Prepared',  color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200'  },
  shipped:   { label: 'Shipped',   color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200'    },
  delivered: { label: 'Delivered', color: 'text-sky-700',    bg: 'bg-sky-50',     border: 'border-sky-200'     },
  cancelled: { label: 'Cancelled', color: 'text-gray-500',   bg: 'bg-gray-50',    border: 'border-gray-200'    },
  pending:   { label: 'Pending',   color: 'text-rose-700',   bg: 'bg-rose-50',    border: 'border-rose-200'    },
}

export default function AgentHistoryPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agentName, setAgentName] = useState<string>('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'prepared' | 'delivered' | 'cancelled'>('all')
  const [busy, setBusy] = useState<string | null>(null)

  const load = async (aid: string | null) => {
    let q = supabase.from('orders').select('*').order('last_call_at', { ascending: false })
    if (aid) q = q.eq('last_call_agent_id', aid)
    let { data } = await q
    // Fallback: if filtering by agent returns nothing, show any touched order
    if (aid && (!data || data.length === 0)) {
      const r = await supabase
        .from('orders')
        .select('*')
        .gt('call_attempts', 0)
        .order('last_call_at', { ascending: false })
      data = r.data
    }
    setOrders((data || []) as OrderRow[])
    setLoading(false)
  }

  useEffect(() => {
    try {
      const u = localStorage.getItem('shipedo_agent')
      if (u) {
        const parsed = JSON.parse(u)
        if (parsed.role === 'agent') {
          setAgentId(parsed.id)
          setAgentName(parsed.name || '')
          load(parsed.id)
          return
        }
      }
    } catch {}
    setLoading(false)
  }, [])

  const advance = async (o: OrderRow, next: 'prepared' | 'delivered' | 'cancelled') => {
    if (!agentId) return
    setBusy(o.id)
    const patch: any = { status: next }
    await supabase.from('orders').update(patch).eq('id', o.id)
    if (next === 'delivered') {
      await decrementTotalQuantityForOrderItems(o.items as any[])
    }
    setBusy(null)
    if (agentId) load(agentId)
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = o.tracking_number.toLowerCase().includes(q) || (o.customer_name || '').toLowerCase().includes(q)
    const matchFilter = filter === 'all' || o.status === filter
    return matchSearch && matchFilter
  })

  const stats = useMemo(() => ({
    total:     orders.length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    prepared:  orders.filter(o => o.status === 'prepared').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  }), [orders])

  const rate = stats.total > 0 ? (((stats.confirmed + stats.prepared + stats.delivered) / stats.total) * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="font-bold text-[#1a1c3a] text-lg">My Orders</h1>
        <p className="text-xs text-gray-400 mt-0.5">{agentName ? `${agentName} · ` : ''}All orders you handled</p>
      </div>

      <div className="px-6 pt-5 pb-10 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total',     value: stats.total,     icon: Phone,       color: 'text-[#1a1c3a]',   bg: 'bg-white'      },
            { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Prepared',  value: stats.prepared,  icon: Package,     color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
            { label: 'Delivered', value: stats.delivered, icon: Truck,       color: 'text-sky-600',     bg: 'bg-sky-50'     },
            { label: 'Success',   value: `${rate}%`,      icon: TrendingUp,  color: 'text-[#f4991a]',   bg: 'bg-orange-50'  },
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
              placeholder="Search orders..."
              className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] shadow-sm"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300"><X size={13} /></button>}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all','confirmed','prepared','delivered','cancelled'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filter === f ? 'bg-[#1a1c3a] text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Orders list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  {['Order','Customer','Status','Total','Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5 first:px-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-16 text-gray-400 text-sm">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16 text-gray-400 text-sm">No orders yet</td></tr>
                ) : filtered.map(o => {
                  const cfg = statusConfig[o.status] || statusConfig.pending
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-mono font-bold text-[#1a1c3a]">{o.tracking_number}</p>
                        <p className="text-[10px] text-gray-400">{new Date(o.last_call_at || o.created_at).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                            {(o.customer_name || '?')[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#1a1c3a] truncate">{o.customer_name}</p>
                            <p className="text-[10px] text-gray-400 flex items-center gap-1"><MapPin size={9} />{o.customer_city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn('inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border', cfg.color, cfg.bg, cfg.border)}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-bold text-[#1a1c3a]">KES {(o.total_amount || 0).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          {o.status === 'confirmed' && (
                            <button
                              disabled={busy === o.id}
                              onClick={() => advance(o, 'prepared')}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-lg disabled:opacity-50"
                            >
                              <Package size={10} className="inline mr-1" /> Prepare
                            </button>
                          )}
                          {o.status === 'prepared' && (
                            <button
                              disabled={busy === o.id}
                              onClick={() => advance(o, 'delivered')}
                              className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-[10px] font-bold rounded-lg disabled:opacity-50"
                            >
                              <Truck size={10} className="inline mr-1" /> Deliver
                            </button>
                          )}
                          {(o.status === 'confirmed' || o.status === 'prepared') && (
                            <button
                              disabled={busy === o.id}
                              onClick={() => advance(o, 'cancelled')}
                              className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 text-[10px] font-bold rounded-lg disabled:opacity-50"
                            >
                              <XCircle size={10} className="inline mr-1" /> Cancel
                            </button>
                          )}
                          {o.status === 'delivered' && (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle size={11} /> Done
                            </span>
                          )}
                        </div>
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
