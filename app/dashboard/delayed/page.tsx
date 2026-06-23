'use client'

import { useEffect, useState, useMemo } from 'react'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import {
  Search, Clock, AlertTriangle, Phone, MapPin, Package,
  X, Calendar, Truck, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type OrderRow = {
  id: string
  tracking_number: string
  delivery_tracking?: string | null
  customer_name: string
  customer_phone: string
  customer_city: string
  customer_address: string
  items: any[]
  total_amount: number
  status: string
  payment_method: string
  notes?: string | null
  shipped_to_agent_at: string
  assigned_agent_id?: string | null
}

function cleanPhone(p: string) {
  let num = (p || '').replace(/[^\d+]/g, '')
  if (/^0[17]\d{8}$/.test(num)) num = '254' + num.slice(1)
  return num
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function getDaysColor(days: number): string {
  if (days >= 14) return 'bg-red-600 text-white'
  if (days >= 10) return 'bg-red-500 text-white'
  if (days >= 8) return 'bg-orange-500 text-white'
  return 'bg-amber-400 text-gray-900'
}

export default function DelayedOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [agentMap, setAgentMap] = useState<Record<string, string>>({})
  const [minDays, setMinDays] = useState(7)

  useEffect(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    Promise.all([
      supabase.from('orders')
        .select('id, tracking_number, delivery_tracking, customer_name, customer_phone, customer_city, customer_address, items, total_amount, status, payment_method, notes, shipped_to_agent_at, assigned_agent_id')
        .eq('status', 'shipped_to_agent')
        .not('shipped_to_agent_at', 'is', null)
        .lte('shipped_to_agent_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .order('shipped_to_agent_at', { ascending: true })
        .limit(1000),
      supabase.from('agents').select('id, name'),
    ]).then(([ordersRes, agentsRes]) => {
      setOrders((ordersRes.data || []) as OrderRow[])
      const map: Record<string, string> = {}
      ;(agentsRes.data || []).forEach((a: any) => { map[a.id] = a.name })
      setAgentMap(map)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return orders
      .filter(o => {
        const days = daysSince(o.shipped_to_agent_at)
        if (days < minDays) return false
        if (!q) return true
        return (
          o.tracking_number?.toLowerCase().includes(q) ||
          (o.delivery_tracking || '').toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_phone?.includes(q) ||
          o.customer_city?.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => daysSince(b.shipped_to_agent_at) - daysSince(a.shipped_to_agent_at))
  }, [orders, search, minDays])

  const stats = useMemo(() => {
    const buckets = { '7-9': 0, '10-13': 0, '14+': 0 }
    orders.forEach(o => {
      const d = daysSince(o.shipped_to_agent_at)
      if (d >= 14) buckets['14+']++
      else if (d >= 10) buckets['10-13']++
      else buckets['7-9']++
    })
    return buckets
  }, [orders])

  return (
    <div className="p-6 space-y-4">
      <Header title="Delayed Orders" subtitle={`${orders.length} order(s) stuck at "Sent to Agent" for 7+ days`} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setMinDays(7)}
          className={cn('bg-white rounded-xl border shadow-sm p-4 text-left transition-all hover:shadow-md',
            minDays === 7 ? 'border-2 border-amber-400' : 'border-gray-100')}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><Clock size={16} className="text-amber-600" /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">7-9 days</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats['7-9']}</p>
        </button>
        <button onClick={() => setMinDays(10)}
          className={cn('bg-white rounded-xl border shadow-sm p-4 text-left transition-all hover:shadow-md',
            minDays === 10 ? 'border-2 border-orange-400' : 'border-gray-100')}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center"><AlertTriangle size={16} className="text-orange-600" /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">10-13 days</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats['10-13']}</p>
        </button>
        <button onClick={() => setMinDays(14)}
          className={cn('bg-white rounded-xl border shadow-sm p-4 text-left transition-all hover:shadow-md',
            minDays === 14 ? 'border-2 border-red-400' : 'border-gray-100')}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><AlertTriangle size={16} className="text-red-600" /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">14+ days</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats['14+']}</p>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search tracking, name, phone, city..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Orders */}
      <div className="space-y-2">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-sm text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No delayed orders</p>
          </div>
        ) : filtered.map(order => {
          const days = daysSince(order.shipped_to_agent_at)
          return (
            <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between bg-gray-50/40 border-b border-gray-50">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', getDaysColor(days))}>
                    {days} days
                  </span>
                  <span className="text-xs font-mono font-bold text-[#1a1c3a]">{order.tracking_number}</span>
                  {order.delivery_tracking && (
                    <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      {order.delivery_tracking}
                    </span>
                  )}
                  {order.assigned_agent_id && agentMap[order.assigned_agent_id] && (
                    <span className="text-[9px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                      {agentMap[order.assigned_agent_id]}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">{order.payment_method}</span>
                  {(order.total_amount || 0) > 0 && (
                    <span className="text-xs font-bold text-[#f4991a]">KES {order.total_amount.toLocaleString()}</span>
                  )}
                </div>
                <a href={`tel:${cleanPhone(order.customer_phone)}`}
                  className="w-8 h-8 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500 flex-shrink-0">
                  <Phone size={14} />
                </a>
              </div>
              <div className="px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#1a1c3a]">{order.customer_name}</p>
                  <span className="text-xs text-gray-400">{order.customer_phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                  {order.customer_address && <span>{order.customer_address},</span>}
                  <span className="font-semibold">{order.customer_city}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                  <Package size={12} className="text-gray-300 flex-shrink-0" />
                  {(Array.isArray(order.items) ? order.items : []).map((it: any, i: number) => (
                    <span key={i} className="font-medium">{it.name || 'Item'} x{it.quantity || 1}{i < order.items.length - 1 ? ' · ' : ''}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Truck size={10} /> Sent: {new Date(order.shipped_to_agent_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {order.notes && (
                  <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                    <MessageSquare size={11} className="mt-0.5 flex-shrink-0" />
                    <span>{order.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
