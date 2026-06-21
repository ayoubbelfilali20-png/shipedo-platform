'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Search, Truck, CheckCircle, RotateCcw, Package, Phone, MapPin,
  X, Calendar, MessageSquare, Clock,
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
  shipped_at?: string | null
  delivered_at?: string | null
  returned_at?: string | null
  created_at: string
}

const COLS = 'id, tracking_number, delivery_tracking, customer_name, customer_phone, customer_city, customer_address, items, total_amount, status, payment_method, notes, shipped_to_agent_at, shipped_at, delivered_at, returned_at, created_at'

function cleanPhone(p: string) {
  let num = (p || '').replace(/[^\d+]/g, '')
  if (/^0[17]\d{8}$/.test(num)) num = '254' + num.slice(1)
  return num
}

type FilterTab = 'to_deliver' | 'delivered' | 'returned'

export default function DeliveryOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<FilterTab>('to_deliver')
  const [processing, setProcessing] = useState<string | null>(null)

  // Note modal
  const [noteModal, setNoteModal] = useState<{ orderId: string; action: 'delivered' | 'not_delivered' } | null>(null)
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    supabase.from('orders').select(COLS)
      .in('status', ['shipped_to_agent', 'delivered', 'returned'])
      .order('shipped_to_agent_at', { ascending: false, nullsFirst: false })
      .limit(1000)
      .then(({ data }) => { setOrders((data || []) as OrderRow[]); setLoading(false) })
  }, [])

  const counts = useMemo(() => {
    const toDeliver = orders.filter(o => o.status === 'shipped_to_agent').length
    const delivered = orders.filter(o => o.status === 'delivered').length
    const returned = orders.filter(o => o.status === 'returned').length
    return { toDeliver, delivered, returned }
  }, [orders])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return orders.filter(o => {
      if (tab === 'to_deliver' && o.status !== 'shipped_to_agent') return false
      if (tab === 'delivered' && o.status !== 'delivered') return false
      if (tab === 'returned' && o.status !== 'returned') return false
      if (!q) return true
      return (
        o.tracking_number?.toLowerCase().includes(q) ||
        (o.delivery_tracking || '').toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.customer_city?.toLowerCase().includes(q)
      )
    })
  }, [orders, search, tab])

  const markDelivered = async (orderId: string, note: string) => {
    setProcessing(orderId)
    const patch: any = {
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    }
    if (note) patch.notes = note
    await supabase.from('orders').update(patch).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o))
    setProcessing(null)
  }

  const markNotDelivered = async (orderId: string, reason: string) => {
    setProcessing(orderId)
    const patch: any = {
      status: 'returned',
      returned_at: new Date().toISOString(),
      notes: reason || 'Not delivered',
    }
    await supabase.from('orders').update(patch).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o))
    setProcessing(null)
  }

  const submitNote = () => {
    if (!noteModal) return
    if (noteModal.action === 'delivered') {
      markDelivered(noteModal.orderId, noteText.trim())
    } else {
      if (!noteText.trim()) return
      markNotDelivered(noteModal.orderId, noteText.trim())
    }
    setNoteModal(null)
    setNoteText('')
  }

  return (
    <div className="p-6 space-y-4">
      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setTab('to_deliver')}
          className={cn('bg-white rounded-xl border shadow-sm p-4 text-left transition-all hover:shadow-md',
            tab === 'to_deliver' ? 'border-2 border-purple-400 bg-purple-50' : 'border-gray-100')}>
          <div className="flex items-center gap-2 mb-1">
            <Package size={16} className="text-purple-600" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">To Deliver</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{counts.toDeliver}</p>
        </button>
        <button onClick={() => setTab('delivered')}
          className={cn('bg-white rounded-xl border shadow-sm p-4 text-left transition-all hover:shadow-md',
            tab === 'delivered' ? 'border-2 border-emerald-400 bg-emerald-50' : 'border-gray-100')}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-emerald-600" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">Delivered</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{counts.delivered}</p>
        </button>
        <button onClick={() => setTab('returned')}
          className={cn('bg-white rounded-xl border shadow-sm p-4 text-left transition-all hover:shadow-md',
            tab === 'returned' ? 'border-2 border-red-400 bg-red-50' : 'border-gray-100')}>
          <div className="flex items-center gap-2 mb-1">
            <RotateCcw size={16} className="text-red-600" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">Not Delivered</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{counts.returned}</p>
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
            <Truck size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{tab === 'to_deliver' ? 'No orders to deliver' : 'No orders found'}</p>
          </div>
        ) : filtered.map(order => (
          <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between bg-gray-50/40 border-b border-gray-50">
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
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <a href={`tel:${cleanPhone(order.customer_phone)}`}
                  className="w-8 h-8 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500">
                  <Phone size={14} />
                </a>
                {order.status === 'shipped_to_agent' && (
                  <>
                    <button disabled={processing === order.id}
                      onClick={() => { setNoteModal({ orderId: order.id, action: 'delivered' }); setNoteText('') }}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg">
                      Delivered
                    </button>
                    <button disabled={processing === order.id}
                      onClick={() => { setNoteModal({ orderId: order.id, action: 'not_delivered' }); setNoteText('') }}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold rounded-lg">
                      Not Delivered
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Body */}
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
              <div className="flex items-center gap-2 flex-wrap">
                {order.shipped_to_agent_at && (
                  <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Calendar size={10} /> Sent: {new Date(order.shipped_to_agent_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
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
              {order.notes && (
                <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                  <MessageSquare size={11} className="mt-0.5 flex-shrink-0" />
                  <span>{order.notes}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-[#1a1c3a]">
                {noteModal.action === 'delivered' ? 'Mark as Delivered' : 'Not Delivered — Reason'}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {noteModal.action === 'delivered'
                  ? 'Add a delivery note (optional)'
                  : 'Please explain why the order was not delivered'}
              </p>
            </div>
            <div className="p-5">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder={noteModal.action === 'delivered' ? 'e.g. Delivered to reception' : 'e.g. Customer not available, wrong address...'}
                rows={3}
                autoFocus
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => { setNoteModal(null); setNoteText('') }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-500 text-sm font-bold rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button
                disabled={noteModal.action === 'not_delivered' && !noteText.trim()}
                onClick={submitNote}
                className={cn('flex-1 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-40',
                  noteModal.action === 'delivered' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700')}>
                {noteModal.action === 'delivered' ? 'Confirm Delivered' : 'Confirm Not Delivered'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
