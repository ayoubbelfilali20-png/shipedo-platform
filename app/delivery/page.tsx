'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Truck, Package, CheckCircle, RotateCcw, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type OrderRow = {
  id: string
  tracking_number: string
  delivery_tracking?: string | null
  customer_name: string
  customer_city: string
  status: string
  total_amount: number
  shipped_to_agent_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  returned_at?: string | null
}

const COLS = 'id, tracking_number, delivery_tracking, customer_name, customer_city, status, total_amount, shipped_to_agent_at, shipped_at, delivered_at, returned_at'

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

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

  const stats = useMemo(() => {
    const shippedToAgent = orders.filter(o => o.status === 'shipped_to_agent').length
    const shipped = orders.filter(o => o.status === 'shipped').length
    const delivered = orders.filter(o => o.status === 'delivered').length
    const returned = orders.filter(o => o.status === 'returned').length
    const revenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total_amount || 0), 0)
    return { shippedToAgent, shipped, delivered, returned, revenue, total: orders.length }
  }, [orders])

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><Package size={16} className="text-purple-600" /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">To Deliver</span>
          </div>
          <p className="text-2xl font-bold text-[#1a1c3a]">{stats.shippedToAgent}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Truck size={16} className="text-blue-600" /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Shipped</span>
          </div>
          <p className="text-2xl font-bold text-[#1a1c3a]">{stats.shipped}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle size={16} className="text-emerald-600" /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Delivered</span>
          </div>
          <p className="text-2xl font-bold text-[#1a1c3a]">{stats.delivered}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><RotateCcw size={16} className="text-red-600" /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Returned</span>
          </div>
          <p className="text-2xl font-bold text-[#1a1c3a]">{stats.returned}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-[#1a1c3a]">Orders to Deliver</h2>
          <Link href="/delivery/orders" className="text-xs font-semibold text-[#f4991a] hover:text-orange-600">View all</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading...</div>
          ) : orders.filter(o => o.status === 'shipped_to_agent').length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No pending deliveries</p>
            </div>
          ) : orders.filter(o => o.status === 'shipped_to_agent').slice(0, 10).map(o => (
            <div key={o.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">
                {(o.customer_name || '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1a1c3a] truncate">{o.customer_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400 font-mono">{o.tracking_number}</span>
                  {o.delivery_tracking && (
                    <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{o.delivery_tracking}</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-[#f4991a]">KES {(o.total_amount || 0).toLocaleString()}</p>
                <p className="text-[10px] text-gray-400">{o.customer_city}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
