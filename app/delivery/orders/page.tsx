'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Search, Truck, Package, Phone, MapPin,
  X, Calendar, MessageSquare, Save,
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
  shipped_to_agent_at?: string | null
  created_at: string
}

const COLS = 'id, tracking_number, delivery_tracking, customer_name, customer_phone, customer_city, customer_address, items, total_amount, status, payment_method, notes, shipped_to_agent_at, created_at'

function cleanPhone(p: string) {
  let num = (p || '').replace(/[^\d+]/g, '')
  if (/^0[17]\d{8}$/.test(num)) num = '254' + num.slice(1)
  return num
}

export default function DeliveryOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [noteEditId, setNoteEditId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    supabase.from('orders').select(COLS)
      .eq('status', 'shipped_to_agent')
      .order('shipped_to_agent_at', { ascending: false, nullsFirst: false })
      .limit(1000)
      .then(({ data }) => { setOrders((data || []) as OrderRow[]); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return orders.filter(o => {
      if (!q) return true
      return (
        o.tracking_number?.toLowerCase().includes(q) ||
        (o.delivery_tracking || '').toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.customer_city?.toLowerCase().includes(q)
      )
    })
  }, [orders, search])

  const saveNote = async (orderId: string) => {
    setSavingNote(true)
    await supabase.from('orders').update({ notes: noteText.trim() || null }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, notes: noteText.trim() || null } : o))
    setNoteEditId(null)
    setNoteText('')
    setSavingNote(false)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[#1a1c3a] text-lg">Orders Sent to Agent</h2>
          <p className="text-xs text-gray-400 mt-0.5">{orders.length} order(s) to follow up</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
          <Package size={20} className="text-purple-600" />
        </div>
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
            <p className="text-sm">No orders to follow up</p>
          </div>
        ) : filtered.map(order => (
          <div key={order.id} className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between bg-purple-50/40 border-b border-purple-100">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="text-xs font-mono font-bold text-[#1a1c3a]">{order.tracking_number}</span>
                {order.delivery_tracking && (
                  <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                    {order.delivery_tracking}
                  </span>
                )}
                <span className="text-[10px] text-gray-400">{order.payment_method}</span>
                {(order.total_amount || 0) > 0 && (
                  <span className="text-xs font-bold text-[#f4991a]">KES {order.total_amount.toLocaleString()}</span>
                )}
              </div>
              <a href={`tel:${cleanPhone(order.customer_phone)}`}
                className="w-8 h-8 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500">
                <Phone size={14} />
              </a>
            </div>

            <div className="px-4 py-3 space-y-2">
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
              {order.shipped_to_agent_at && (
                <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                  <Calendar size={10} /> Sent: {new Date(order.shipped_to_agent_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}

              {/* Note */}
              {noteEditId === order.id ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-2">
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                    placeholder="Write delivery note or reason..."
                    rows={2} autoFocus
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 resize-none" />
                  <div className="flex gap-1.5">
                    <button onClick={() => saveNote(order.id)} disabled={savingNote}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg">
                      <Save size={10} /> {savingNote ? 'Saving...' : 'Save Note'}
                    </button>
                    <button onClick={() => { setNoteEditId(null); setNoteText('') }}
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {order.notes ? (
                    <div className="flex-1 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                      <MessageSquare size={11} className="mt-0.5 flex-shrink-0" />
                      <span>{order.notes}</span>
                    </div>
                  ) : null}
                  <button onClick={() => { setNoteEditId(order.id); setNoteText(order.notes || '') }}
                    className="text-xs font-bold text-gray-400 hover:text-amber-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-50">
                    <MessageSquare size={11} /> {order.notes ? 'Edit' : 'Add Note'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
