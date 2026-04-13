'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { decrementTotalQuantityForOrderItems } from '@/lib/stock'
import { incrementStockForOrderItems } from '@/lib/stock'
import { cn } from '@/lib/utils'
import {
  Phone, CheckCircle, Search, X, TrendingUp, Package, Truck, MapPin,
  ChevronDown, Pencil, Save, MessageCircle,
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
  shipped_at?: string | null
  delivered_at?: string | null
  returned_at?: string | null
}

type AllStatus = 'pending' | 'confirmed' | 'prepared' | 'shipped' | 'delivered' | 'returned' | 'cancelled'

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'Pending',   color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200'    },
  confirmed: { label: 'Confirmed', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  prepared:  { label: 'Prepared',  color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200'  },
  shipped:   { label: 'Shipped',   color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200'    },
  delivered: { label: 'Delivered', color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200'     },
  returned:  { label: 'Returned',  color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200'     },
  cancelled: { label: 'Cancelled', color: 'text-gray-500',    bg: 'bg-gray-50',    border: 'border-gray-200'    },
}

const allStatuses: AllStatus[] = ['pending', 'confirmed', 'prepared', 'shipped', 'delivered', 'returned', 'cancelled']

function cleanPhone(p: string) { return (p || '').replace(/[^\d+]/g, '') }
function whatsappLink(phone: string, text: string) {
  const num = cleanPhone(phone).replace(/^\+/, '')
  return `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(text)}`
}

export default function AgentHistoryPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agentName, setAgentName] = useState<string>('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [busy, setBusy] = useState<string | null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const load = async (aid: string | null) => {
    if (!aid) { setLoading(false); return }
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('assigned_agent_id', aid)
      .order('last_call_at', { ascending: false, nullsFirst: false })
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

  const changeStatus = async (orderId: string, newStatus: string) => {
    setBusy(orderId)
    const patch: any = { status: newStatus }

    if (newStatus === 'shipped') patch.shipped_at = new Date().toISOString()
    if (newStatus === 'delivered') {
      patch.delivered_at = new Date().toISOString()
      const order = orders.find(o => o.id === orderId)
      if (order) await decrementTotalQuantityForOrderItems(order.items as any[])
    }
    if (newStatus === 'returned') {
      patch.returned_at = new Date().toISOString()
      const order = orders.find(o => o.id === orderId)
      if (order) await incrementStockForOrderItems(order.items)
    }
    if (newStatus === 'confirmed' || newStatus === 'prepared' || newStatus === 'pending') {
      patch.shipped_at = null
      patch.delivered_at = null
      patch.returned_at = null
    }
    if (newStatus === 'cancelled') {
      patch.shipped_at = null
      patch.delivered_at = null
      patch.returned_at = null
    }

    await supabase.from('orders').update(patch).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o))
    setBusy(null)
  }

  // Edit client info
  const startEdit = (order: OrderRow) => {
    setEditingId(order.id)
    setEditName(order.customer_name)
    setEditPhone(order.customer_phone)
    setEditCity(order.customer_city || '')
    setEditAddress(order.customer_address || '')
  }

  const cancelEdit = () => { setEditingId(null) }

  const saveEdit = async () => {
    if (!editingId) return
    setSavingEdit(true)
    const patch = {
      customer_name: editName.trim(),
      customer_phone: editPhone.trim(),
      customer_city: editCity.trim(),
      customer_address: editAddress.trim(),
    }
    await supabase.from('orders').update(patch).eq('id', editingId)
    setOrders(prev => prev.map(o => o.id === editingId ? { ...o, ...patch } : o))
    setSavingEdit(false)
    setEditingId(null)
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = o.tracking_number.toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_phone || '').includes(q)
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
            {(['all','pending','confirmed','prepared','shipped','delivered','returned','cancelled'] as const).map(f => (
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
        <div className="space-y-2">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-sm text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders found</p>
            </div>
          ) : filtered.map(o => {
            const isEditing = editingId === o.id
            return (
              <div key={o.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-[#1a1c3a]">{o.tracking_number}</span>
                      <span className="text-[10px] text-gray-400">{new Date(o.last_call_at || o.created_at).toLocaleString()}</span>
                    </div>

                    {isEditing ? (
                      /* ── Edit mode ── */
                      <div className="space-y-2 mt-2 bg-orange-50/50 border border-orange-200 rounded-xl p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Name</label>
                            <input
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Phone</label>
                            <input
                              value={editPhone}
                              onChange={e => setEditPhone(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">City</label>
                            <input
                              value={editCity}
                              onChange={e => setEditCity(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Address</label>
                            <input
                              value={editAddress}
                              onChange={e => setEditAddress(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={saveEdit}
                            disabled={savingEdit}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition-all"
                          >
                            <Save size={11} /> {savingEdit ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[11px] font-bold rounded-lg transition-all"
                          >
                            <X size={11} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Display mode ── */
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                            {(o.customer_name || '?')[0]}
                          </div>
                          <p className="text-sm font-semibold text-[#1a1c3a]">{o.customer_name}</p>
                          <button
                            onClick={() => startEdit(o)}
                            className="w-5 h-5 rounded flex items-center justify-center text-gray-300 hover:text-[#f4991a] hover:bg-orange-50 transition-all"
                            title="Edit client info"
                          >
                            <Pencil size={10} />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Phone size={10} /> {o.customer_phone}</span>
                          <span className="flex items-center gap-1"><MapPin size={10} /> {o.customer_city}</span>
                        </div>
                        {o.customer_address && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{o.customer_address}</p>
                        )}
                      </>
                    )}

                    <p className="text-xs font-bold text-[#f4991a] mt-1">KES {(o.total_amount || 0).toLocaleString()}</p>

                    {/* Items preview */}
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                      <Package size={10} />
                      {(Array.isArray(o.items) ? o.items : []).map((it: any, i: number) => (
                        <span key={i}>{it.name || 'Item'} x{it.quantity || 1}{i < (o.items || []).length - 1 ? ',' : ''}</span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Call & WhatsApp */}
                    <a
                      href={`tel:${cleanPhone(o.customer_phone)}`}
                      className="w-8 h-8 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500 transition-all"
                      title="Call"
                    >
                      <Phone size={13} />
                    </a>
                    <a
                      href={whatsappLink(o.customer_phone, `Hello 👋 ${o.customer_name}, regarding your order *${o.tracking_number}*. How can we help you?`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-all"
                      title="WhatsApp"
                    >
                      <MessageCircle size={13} />
                    </a>

                    {/* Status dropdown */}
                    <StatusDropdown
                      currentStatus={o.status as AllStatus}
                      processing={busy === o.id}
                      onChangeStatus={(s) => changeStatus(o.id, s)}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Status Dropdown ── */
function StatusDropdown({ currentStatus, processing, onChangeStatus }: {
  currentStatus: AllStatus
  processing: boolean
  onChangeStatus: (s: string) => void
}) {
  const [open, setOpen] = useState(false)
  const cfg = statusConfig[currentStatus] || statusConfig.pending

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={processing}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-full border-2 text-[11px] font-semibold transition-all',
          cfg.color, cfg.border, processing && 'opacity-50'
        )}
      >
        {cfg.label}
        <ChevronDown size={10} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 min-w-[150px]">
            {allStatuses.map(s => {
              const c = statusConfig[s]
              return (
                <button
                  key={s}
                  onClick={() => { onChangeStatus(s); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors text-left',
                    currentStatus === s ? c.color : 'text-gray-600'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', {
                    'bg-rose-500':    s === 'pending',
                    'bg-emerald-500': s === 'confirmed',
                    'bg-indigo-500':  s === 'prepared',
                    'bg-blue-500':    s === 'shipped',
                    'bg-sky-500':     s === 'delivered',
                    'bg-red-500':     s === 'returned',
                    'bg-gray-400':    s === 'cancelled',
                  })} />
                  {c.label}
                  {currentStatus === s && <CheckCircle size={11} className="ml-auto" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
