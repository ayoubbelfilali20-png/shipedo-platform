'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, Phone, MapPin, Calendar, MessageSquare } from 'lucide-react'
import Link from 'next/link'

type OrderRow = {
  id: string
  tracking_number: string
  delivery_tracking?: string | null
  customer_name: string
  customer_phone: string
  customer_city: string
  total_amount: number
  notes?: string | null
  shipped_to_agent_at?: string | null
}

function cleanPhone(p: string) {
  let num = (p || '').replace(/[^\d+]/g, '')
  if (/^0[17]\d{8}$/.test(num)) num = '254' + num.slice(1)
  return num
}

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('orders')
      .select('id, tracking_number, delivery_tracking, customer_name, customer_phone, customer_city, total_amount, notes, shipped_to_agent_at')
      .eq('status', 'shipped_to_agent')
      .order('shipped_to_agent_at', { ascending: false, nullsFirst: false })
      .limit(500)
      .then(({ data }) => { setOrders((data || []) as OrderRow[]); setLoading(false) })
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[#1a1c3a] text-xl">Orders to Follow Up</h2>
          <p className="text-xs text-gray-400 mt-1">{orders.length} order(s) sent to agent waiting for delivery update</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
          <Package size={24} className="text-purple-600" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-[#1a1c3a]">Sent to Agent ({orders.length})</h3>
          <Link href="/delivery/orders" className="text-xs font-semibold text-[#f4991a] hover:text-orange-600">View all</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Package size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No orders to follow up</p>
            </div>
          ) : orders.slice(0, 20).map(o => (
            <div key={o.id} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-[#1a1c3a] truncate">{o.customer_name}</p>
                  <span className="text-[10px] text-gray-400">{o.customer_phone}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400 font-mono">{o.tracking_number}</span>
                  {o.delivery_tracking && (
                    <span className="text-[9px] font-mono font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{o.delivery_tracking}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                  <MapPin size={10} /> {o.customer_city}
                  {o.shipped_to_agent_at && (
                    <span><Calendar size={10} className="inline" /> {new Date(o.shipped_to_agent_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                  )}
                </div>
                {o.notes && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600">
                    <MessageSquare size={9} /> {o.notes}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold text-[#f4991a]">KES {(o.total_amount || 0).toLocaleString()}</span>
                <a href={`tel:${cleanPhone(o.customer_phone)}`}
                  className="w-8 h-8 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500">
                  <Phone size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
