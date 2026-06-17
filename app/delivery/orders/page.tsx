'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Search, Truck, CheckCircle, RotateCcw, Package, Phone,
  X, ChevronDown, MapPin, Calendar, Clock,
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
  shipped_to_agent_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  returned_at?: string | null
  created_at: string
}

const COLS = 'id, tracking_number, delivery_tracking, customer_name, customer_phone, customer_city, customer_address, items, total_amount, status, payment_method, shipped_to_agent_at, shipped_at, delivered_at, returned_at, created_at'

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  shipped_to_agent: { label: 'To Deliver',  color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  shipped:          { label: 'Shipped',      color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200'    },
  delivered:        { label: 'Delivered',    color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  returned:         { label: 'Returned',     color: 'text-red-600',    bg: 'bg-red-50 border-red-200'      },
}

type FilterStatus = 'all' | 'shipped_to_agent' | 'shipped' | 'delivered' | 'returned'

function cleanPhone(p: string) {
  let num = (p || '').replace(/[^\d+]/g, '')
  if (/^0[17]\d{8}$/.test(num)) num = '254' + num.slice(1)
  return num
}

export default function DeliveryOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('orders').select(COLS)
      .in('status', ['shipped_to_agent', 'shipped', 'delivered', 'returned'])
      .order('shipped_to_agent_at', { ascending: false, nullsFirst: false })
      .limit(1000)
      .then(({ data }) => {
        setOrders((data || []) as OrderRow[])
        setLoading(false)
      })
  }, [])

  const counts = useMemo(() => {
    const acc: Record<string, number> = { shipped_to_agent: 0, shipped: 0, delivered: 0, returned: 0 }
    orders.forEach(o => { if (acc[o.status] !== undefined) acc[o.status]++ })
    return acc
  }, [orders])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return orders.filter(o => {
      if (filterStatus !== 'all' && o.status !== filterStatus) return false
      if (!q) return true
      return (
        o.tracking_number?.toLowerCase().includes(q) ||
        (o.delivery_tracking || '').toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.customer_city?.toLowerCase().includes(q) ||
        o.customer_address?.toLowerCase().includes(q)
      )
    })
  }, [orders, search, filterStatus])

  const changeStatus = async (orderId: string, newStatus: string) => {
    setProcessing(orderId)
    const patch: any = { status: newStatus }
    if (newStatus === 'shipped') patch.shipped_at = new Date().toISOString()
    if (newStatus === 'delivered') patch.delivered_at = new Date().toISOString()
    if (newStatus === 'returned') patch.returned_at = new Date().toISOString()
    await supabase.from('orders').update(patch).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o))
    setProcessing(null)
  }

  return (
    <div className="p-6 space-y-4">
      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(['shipped_to_agent', 'shipped', 'delivered', 'returned'] as const).map(s => {
          const cfg = statusConfig[s]
          return (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
              className={cn('bg-white rounded-xl border shadow-sm p-3 text-left transition-all hover:shadow-md',
                filterStatus === s ? `border-2 ${cfg.bg}` : 'border-gray-100')}>
              <p className={cn('text-lg font-bold', cfg.color)}>{counts[s] || 0}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{cfg.label}</p>
            </button>
          )
        })}
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
            <Truck size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : filtered.map(order => {
          const cfg = statusConfig[order.status] || statusConfig.shipped_to_agent
          return (
            <div key={order.id} className={cn('bg-white rounded-xl border shadow-sm overflow-hidden', cfg.bg)}>
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-xs font-mono font-bold text-[#1a1c3a]">{order.tracking_number}</span>
                  {order.delivery_tracking && (
                    <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      {order.delivery_tracking}
                    </span>
                  )}
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.color, cfg.bg)}>{cfg.label}</span>
                  <span className="text-[10px] text-gray-400">{order.payment_method}</span>
                  {(order.total_amount || 0) > 0 && (
                    <span className="text-xs font-bold text-[#f4991a]">KES {order.total_amount.toLocaleString()}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a href={`tel:${cleanPhone(order.customer_phone)}`}
                    className="w-7 h-7 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500">
                    <Phone size={12} />
                  </a>
                  {order.status === 'shipped_to_agent' && (
                    <>
                      <button disabled={processing === order.id} onClick={() => changeStatus(order.id, 'shipped')}
                        className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg">
                        Shipped
                      </button>
                      <button disabled={processing === order.id} onClick={() => changeStatus(order.id, 'delivered')}
                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg">
                        Delivered
                      </button>
                    </>
                  )}
                  {order.status === 'shipped' && (
                    <>
                      <button disabled={processing === order.id} onClick={() => changeStatus(order.id, 'delivered')}
                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg">
                        Delivered
                      </button>
                      <button disabled={processing === order.id} onClick={() => changeStatus(order.id, 'returned')}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[10px] font-bold rounded-lg">
                        Returned
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="px-4 pb-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#1a1c3a]">{order.customer_name}</p>
                  <span className="text-xs text-gray-400">{order.customer_phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                  {order.customer_address && <span>{order.customer_address},</span>}
                  <span className="font-medium">{order.customer_city}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                  <Package size={12} className="text-gray-300 flex-shrink-0" />
                  {(Array.isArray(order.items) ? order.items : []).map((it: any, i: number) => (
                    <span key={i} className="font-medium">{it.name || 'Item'} x{it.quantity || 1}{i < order.items.length - 1 ? ' · ' : ''}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {order.shipped_to_agent_at && (
                    <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Calendar size={10} /> Sent: {new Date(order.shipped_to_agent_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  {order.shipped_at && (
                    <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Truck size={10} /> Shipped: {new Date(order.shipped_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  {order.delivered_at && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <CheckCircle size={10} /> Delivered: {new Date(order.delivered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  {order.returned_at && (
                    <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <RotateCcw size={10} /> Returned: {new Date(order.returned_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
