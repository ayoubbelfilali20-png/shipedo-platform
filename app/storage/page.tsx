'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, CheckCircle, Truck, RotateCcw, Clock, Printer } from 'lucide-react'
import Link from 'next/link'

type OrderRow = {
  id: string
  tracking_number: string
  customer_name: string
  customer_city: string
  status: string
  total_amount: number
  created_at: string
  last_call_at?: string | null
}

export default function StorageDashboard() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('orders')
      .select('id, tracking_number, customer_name, customer_city, status, total_amount, created_at, last_call_at')
      .in('status', ['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'returned'])
      .order('last_call_at', { ascending: false, nullsFirst: false })
      .limit(1000)
      .then(({ data }) => { setOrders((data || []) as OrderRow[]); setLoading(false) })
  }, [])

  const stats = useMemo(() => ({
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    prepared: orders.filter(o => o.status === 'prepared').length,
    shipped_to_agent: orders.filter(o => o.status === 'shipped_to_agent').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    returned: orders.filter(o => o.status === 'returned').length,
  }), [orders])

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { key: 'prepared', label: 'Prepared', icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { key: 'shipped_to_agent', label: 'Sent to Agent', icon: Truck, color: 'text-purple-600', bg: 'bg-purple-100' },
          { key: 'shipped', label: 'Shipped', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-100' },
          { key: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'text-sky-600', bg: 'bg-sky-100' },
          { key: 'returned', label: 'Returned', icon: RotateCcw, color: 'text-red-600', bg: 'bg-red-100' },
        ].map(s => (
          <div key={s.key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}><s.icon size={16} className={s.color} /></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#1a1c3a]">{stats[s.key as keyof typeof stats]}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-[#1a1c3a]">Recent Confirmed Orders</h2>
          <Link href="/storage/orders" className="text-xs font-semibold text-[#f4991a] hover:text-orange-600">View all</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading...</div>
          ) : orders.filter(o => o.status === 'confirmed').slice(0, 10).map(o => (
            <div key={o.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">
                {(o.customer_name || '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1a1c3a] truncate">{o.customer_name}</p>
                <p className="text-[10px] text-gray-400 font-mono">{o.tracking_number} · {o.customer_city}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-[#f4991a]">KES {(o.total_amount || 0).toLocaleString()}</p>
                <p className="text-[10px] text-gray-400">{o.last_call_at ? new Date(o.last_call_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}</p>
              </div>
            </div>
          ))}
          {!loading && orders.filter(o => o.status === 'confirmed').length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Package size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No confirmed orders waiting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
