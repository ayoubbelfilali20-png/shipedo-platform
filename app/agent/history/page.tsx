'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { decrementTotalQuantityForOrderItems } from '@/lib/stock'
import { incrementStockForOrderItems } from '@/lib/stock'
import { cn } from '@/lib/utils'
import {
  Phone, CheckCircle, Search, X, TrendingUp, Package, Truck,
  ChevronDown, Pencil, Save, MessageCircle, Calendar, PhoneOff,
  PhoneCall, Clock, FileText, Plus, Trash2,
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
  seller_id?: string | null
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

function formatDate(d: string) {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatTime(d: string) {
  const dt = new Date(d)
  return dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function formatDateISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getToday() { return formatDateISO(new Date()) }
function getYesterday() {
  const d = new Date(); d.setDate(d.getDate() - 1); return formatDateISO(d)
}
function getWeekStart() {
  const d = new Date(); d.setDate(d.getDate() - d.getDay()); return formatDateISO(d)
}
function getMonthStart() {
  const d = new Date(); d.setDate(1); return formatDateISO(d)
}

function isSameDay(dateStr: string, isoDate: string) {
  const d = new Date(dateStr)
  return formatDateISO(d) === isoDate
}
function isOnOrAfter(dateStr: string, isoDate: string) {
  return formatDateISO(new Date(dateStr)) >= isoDate
}

type DateFilter = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'

export default function AgentHistoryPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agentName, setAgentName] = useState<string>('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [busy, setBusy] = useState<string | null>(null)

  // Date filter
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [customDate, setCustomDate] = useState(getToday())

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Expanded call details
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Item editing per order
  const [editItemsId, setEditItemsId] = useState<string | null>(null)
  const [editItems, setEditItems] = useState<any[]>([])
  const [itemsChanged, setItemsChanged] = useState(false)
  const [savingItems, setSavingItems] = useState(false)
  const [sellerProducts, setSellerProducts] = useState<any[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [editNoteId, setEditNoteId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [editRemindId, setEditRemindId] = useState<string | null>(null)
  const [editRemindDate, setEditRemindDate] = useState('')

  const load = async (aid: string | null) => {
    if (!aid) { setLoading(false); return }
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('assigned_agent_id', aid)
      .order('last_call_at', { ascending: false, nullsFirst: false })
    const rows = (data || []) as OrderRow[]
    setOrders(rows)
    setLoading(false)
    // Enrich items with product images
    const sellerIds = [...new Set(rows.map(r => r.seller_id).filter(Boolean))]
    if (sellerIds.length > 0) {
      const { data: prods } = await supabase.from('products').select('id, image_url').in('seller_id', sellerIds)
      if (prods && prods.length > 0) {
        const imgMap = new Map(prods.map((p: any) => [p.id, p.image_url]))
        setOrders(prev => prev.map(o => ({
          ...o,
          items: Array.isArray(o.items) ? o.items.map((it: any) =>
            it.product_id && !it.image_url && imgMap.has(it.product_id) ? { ...it, image_url: imgMap.get(it.product_id) } : it
          ) : o.items
        })))
      }
    }
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
    if (['confirmed', 'prepared', 'pending', 'cancelled'].includes(newStatus)) {
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

  // Item editing functions
  const startEditItems = (order: OrderRow) => {
    setEditItemsId(order.id)
    const initItems = (Array.isArray(order.items) ? order.items : []).map((it: any, i: number) => ({ ...it, _id: `${Date.now()}-${i}` }))
    setEditItems(initItems)
    setItemsChanged(false)
    // Load seller products + enrich item images
    if (order.seller_id) {
      supabase.from('products').select('id, name, sku, selling_price, stock, image_url')
        .eq('seller_id', order.seller_id).eq('status', 'active')
        .then(({ data }) => {
          const prods = (data || []) as any[]
          setSellerProducts(prods)
          const imgMap = new Map(prods.map((p: any) => [p.id, p.image_url]))
          setEditItems(prev => prev.map(it => it.product_id && !it.image_url && imgMap.has(it.product_id)
            ? { ...it, image_url: imgMap.get(it.product_id) } : it))
        })
    } else {
      setSellerProducts([])
    }
  }
  const cancelEditItems = () => { setEditItemsId(null); setItemsChanged(false) }
  const updateItemPrice = (idx: number, price: number) => {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_price: price } : it)); setItemsChanged(true)
  }
  const updateItemQty = (idx: number, qty: number) => {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, qty) } : it)); setItemsChanged(true)
  }
  const updateItemName = (idx: number, name: string) => {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, name } : it)); setItemsChanged(true)
  }
  const removeItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx)); setItemsChanged(true)
  }
  const addSellerProduct = (p: any) => {
    setEditItems(prev => [...prev, { _id: `${Date.now()}`, product_id: p.id, name: p.name, sku: p.sku || '', image_url: p.image_url || '', quantity: 1, unit_price: p.selling_price || 0 }])
    setItemsChanged(true); setShowProductPicker(false); setProductSearch('')
  }
  const addCustomItem = () => {
    setEditItems(prev => [...prev, { _id: `${Date.now()}`, product_id: null, name: '', sku: '', quantity: 1, unit_price: 0 }])
    setItemsChanged(true)
  }
  const editItemsTotal = editItems.reduce((a: number, it: any) => a + (Number(it.unit_price) || 0) * (Number(it.quantity) || 0), 0)
  const saveItems = async () => {
    if (!editItemsId) return
    setSavingItems(true)
    const cleanItems = editItems.map(({ _id, ...rest }: any) => rest)
    await supabase.from('orders').update({ items: cleanItems, total_amount: editItemsTotal }).eq('id', editItemsId)
    setOrders(prev => prev.map(o => o.id === editItemsId ? { ...o, items: cleanItems, total_amount: editItemsTotal } : o))
    setItemsChanged(false); setSavingItems(false); setEditItemsId(null)
  }
  const startEditNote = (order: OrderRow) => {
    setEditNoteId(order.id)
    setEditNote(order.notes || '')
  }
  const saveNote = async () => {
    if (!editNoteId) return
    setSavingNote(true)
    await supabase.from('orders').update({ notes: editNote.trim() || null }).eq('id', editNoteId)
    setOrders(prev => prev.map(o => o.id === editNoteId ? { ...o, notes: editNote.trim() || null } : o))
    setSavingNote(false)
    setEditNoteId(null)
  }
  const saveRemindDate = async (orderId: string) => {
    if (!editRemindDate) return
    const reminded_at = new Date(editRemindDate).toISOString()
    await supabase.from('orders').update({ reminded_at }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, reminded_at } : o))
    setEditRemindId(null)
    setEditRemindDate('')
  }
  const clearRemind = async (orderId: string) => {
    await supabase.from('orders').update({ reminded_at: null }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, reminded_at: null } : o))
    setEditRemindId(null)
  }
  const filteredSellerProducts = sellerProducts.filter(p => {
    const q = productSearch.toLowerCase()
    return !q || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
  })

  // Filter by date
  const filterByDate = (o: OrderRow) => {
    const ref = o.last_call_at || o.created_at
    if (!ref) return true
    switch (dateFilter) {
      case 'today': return isSameDay(ref, getToday())
      case 'yesterday': return isSameDay(ref, getYesterday())
      case 'this_week': return isOnOrAfter(ref, getWeekStart())
      case 'this_month': return isOnOrAfter(ref, getMonthStart())
      case 'custom': return isSameDay(ref, customDate)
      default: return true
    }
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = o.tracking_number.toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_phone || '').includes(q)
    const matchFilter = filter === 'all' || o.status === filter
    const matchDate = filterByDate(o)
    return matchSearch && matchFilter && matchDate
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
        <h1 className="font-bold text-[#1a1c3a] text-lg">Call History</h1>
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

        {/* Date filter */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-2 flex-wrap">
          <Calendar size={14} className="text-gray-400" />
          {([
            { value: 'all' as DateFilter, label: 'All time' },
            { value: 'today' as DateFilter, label: 'Today' },
            { value: 'yesterday' as DateFilter, label: 'Yesterday' },
            { value: 'this_week' as DateFilter, label: 'This week' },
            { value: 'this_month' as DateFilter, label: 'This month' },
            { value: 'custom' as DateFilter, label: 'Pick date' },
          ]).map(d => (
            <button
              key={d.value}
              onClick={() => setDateFilter(d.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                dateFilter === d.value ? 'bg-[#f4991a] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              )}
            >
              {d.label}
            </button>
          ))}
          {dateFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
            />
          )}
          <span className="text-[10px] text-gray-400 ml-auto">{filtered.length} orders</span>
        </div>

        {/* Search + status filter */}
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
        <div className="space-y-1.5">
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-sm text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders found</p>
            </div>
          ) : filtered.map(o => {
            const isEditing = editingId === o.id
            const isExpanded = expandedId === o.id
            const callCount = o.call_attempts || 0
            const wasCalled = callCount > 0 || !!o.last_call_at
            const cfg = statusConfig[o.status] || statusConfig.pending
            return (
              <div key={o.id} className={cn('bg-white rounded-xl border shadow-sm overflow-hidden', cfg.border)}>
                {/* Header row: tracking + status + actions */}
                <div className="px-3 py-2 flex items-center justify-between border-b border-gray-50 bg-gray-50/50">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="text-[10px] font-mono font-bold text-[#1a1c3a]">{o.tracking_number}</span>
                    {wasCalled ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-[8px] font-bold text-emerald-700">
                        <PhoneCall size={7} /> {callCount}x
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-[8px] font-bold text-gray-400">
                        <PhoneOff size={7} />
                      </span>
                    )}
                    {(o.total_amount || 0) > 0 && (
                      <span className="text-[10px] font-bold text-[#f4991a]">KES {o.total_amount.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setExpandedId(isExpanded ? null : o.id)}
                      className={cn('w-6 h-6 rounded-md flex items-center justify-center transition-all',
                        isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-400')}
                      title="Details">
                      <ChevronDown size={10} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                    <a href={`tel:${cleanPhone(o.customer_phone)}`}
                      className="w-6 h-6 rounded-md bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500 transition-all">
                      <Phone size={10} />
                    </a>
                    <a href={whatsappLink(o.customer_phone, `Hello 👋 ${o.customer_name}, regarding your order *${o.tracking_number}*. How can we help you?`)}
                      target="_blank" rel="noopener noreferrer"
                      className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-all">
                      <MessageCircle size={10} />
                    </a>
                    <StatusDropdown
                      currentStatus={o.status as AllStatus}
                      processing={busy === o.id}
                      onChangeStatus={(s) => changeStatus(o.id, s)}
                    />
                  </div>
                </div>

                {/* Body */}
                <div className="px-3 py-2 space-y-1.5">
                  {isEditing ? (
                    <div className="space-y-1.5 bg-orange-50/50 border border-orange-200 rounded-lg p-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name"
                          className="px-2 py-1 bg-white border border-gray-200 rounded text-[11px] focus:outline-none focus:border-orange-400" />
                        <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone"
                          className="px-2 py-1 bg-white border border-gray-200 rounded text-[11px] focus:outline-none focus:border-orange-400" />
                        <input value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="City"
                          className="px-2 py-1 bg-white border border-gray-200 rounded text-[11px] focus:outline-none focus:border-orange-400" />
                        <input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Address"
                          className="px-2 py-1 bg-white border border-gray-200 rounded text-[11px] focus:outline-none focus:border-orange-400" />
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={saveEdit} disabled={savingEdit}
                          className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[10px] font-bold rounded transition-all">
                          {savingEdit ? '...' : 'Save'}
                        </button>
                        <button onClick={cancelEdit}
                          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-600 text-[10px] font-bold rounded transition-all">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-[#1a1c3a] truncate">{o.customer_name}</p>
                      <span className="text-[10px] text-gray-400 truncate">{o.customer_phone}</span>
                      <span className="text-[10px] text-gray-400 truncate">{o.customer_city}</span>
                      <button onClick={() => startEdit(o)}
                        className="w-4 h-4 rounded flex items-center justify-center text-gray-300 hover:text-[#f4991a] flex-shrink-0">
                        <Pencil size={8} />
                      </button>
                    </div>
                  )}

                  {/* Items inline */}
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 flex-wrap">
                    <Package size={9} />
                    {(Array.isArray(o.items) ? o.items : []).map((it: any, i: number) => (
                      <span key={i}>{it.name || 'Item'} x{it.quantity || 1}{(it.unit_price || 0) > 0 ? ` (${it.unit_price.toLocaleString()})` : ''}{i < (o.items || []).length - 1 ? ',' : ''}</span>
                    ))}
                    <button onClick={() => { setExpandedId(o.id); startEditItems(o) }}
                      className="text-[#f4991a] hover:text-orange-600 font-bold ml-0.5">
                      <Pencil size={8} />
                    </button>
                  </div>

                  {/* Meta: dates + reminded */}
                  <div className="flex items-center gap-2 text-[9px] text-gray-400 flex-wrap">
                    <span>{formatDate(o.created_at)}</span>
                    {o.last_call_at && <span>Call {formatTime(o.last_call_at)}</span>}
                    {o.reminded_at && (
                      editRemindId === o.id ? (
                        <span className="inline-flex items-center gap-1">
                          <input type="datetime-local" value={editRemindDate}
                            onChange={e => setEditRemindDate(e.target.value)}
                            className="px-1 py-0.5 border border-indigo-300 rounded text-[9px] focus:outline-none" />
                          <button onClick={() => saveRemindDate(o.id)} className="text-emerald-600 font-bold">✓</button>
                          <button onClick={() => clearRemind(o.id)} className="text-red-400 font-bold">✕</button>
                          <button onClick={() => setEditRemindId(null)} className="text-gray-400">Cancel</button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-indigo-500 cursor-pointer hover:text-indigo-700"
                          onClick={() => { setEditRemindId(o.id); setEditRemindDate(o.reminded_at ? new Date(o.reminded_at).toISOString().slice(0, 16) : '') }}>
                          <Clock size={8} /> Remind {formatDate(o.reminded_at)} {formatTime(o.reminded_at)}
                          <Pencil size={7} />
                        </span>
                      )
                    )}
                  </div>

                  {/* Call note */}
                  {o.last_call_note && (
                    <div className="flex items-start gap-1 text-[9px] text-blue-600 bg-blue-50 rounded px-1.5 py-1">
                      <Phone size={8} className="mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{o.last_call_note}</span>
                    </div>
                  )}

                  {/* Order note */}
                  {editNoteId === o.id ? (
                    <div className="bg-amber-50/50 border border-amber-200 rounded p-1.5 space-y-1">
                      <textarea value={editNote} onChange={e => setEditNote(e.target.value)}
                        placeholder="Add a note..." rows={2}
                        className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-[10px] focus:outline-none focus:border-amber-400 resize-none" />
                      <div className="flex items-center gap-1">
                        <button onClick={saveNote} disabled={savingNote}
                          className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[9px] font-bold rounded">
                          {savingNote ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditNoteId(null)}
                          className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-600 text-[9px] font-bold rounded">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1">
                      {o.notes && (
                        <div className="flex-1 flex items-start gap-1 text-[9px] text-amber-700 bg-amber-50 rounded px-1.5 py-1">
                          <FileText size={8} className="mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{o.notes}</span>
                        </div>
                      )}
                      <button onClick={() => startEditNote(o)}
                        className="text-[9px] font-bold text-gray-300 hover:text-amber-600 flex-shrink-0 px-1">
                        {o.notes ? <Pencil size={8} /> : <span className="flex items-center gap-0.5"><FileText size={8} /> +</span>}
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Expanded details ── */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-3 py-2 bg-gray-50/30 space-y-2">
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="bg-white rounded border border-gray-100 py-1.5 px-1">
                        <p className="text-[8px] text-gray-400 uppercase">Calls</p>
                        <p className="text-xs font-bold text-[#1a1c3a]">{callCount}</p>
                      </div>
                      <div className="bg-white rounded border border-gray-100 py-1.5 px-1">
                        <p className="text-[8px] text-gray-400 uppercase">Last Call</p>
                        <p className="text-[10px] font-bold text-[#1a1c3a]">{o.last_call_at ? formatTime(o.last_call_at) : '—'}</p>
                      </div>
                      <div className="bg-white rounded border border-gray-100 py-1.5 px-1">
                        <p className="text-[8px] text-gray-400 uppercase">Created</p>
                        <p className="text-[10px] font-bold text-[#1a1c3a]">{formatDate(o.created_at)}</p>
                      </div>
                    </div>

                    {/* ── Edit Items ── */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Order Items</p>
                        <div className="flex items-center gap-1.5">
                          {editItemsId !== o.id ? (
                            <button onClick={() => startEditItems(o)}
                              className="flex items-center gap-1 px-2 py-1 bg-[#f4991a] hover:bg-orange-500 text-white text-[10px] font-bold rounded-lg transition-all">
                              <Pencil size={9} /> Edit items
                            </button>
                          ) : (
                            <>
                              {sellerProducts.length > 0 && (
                                <button onClick={() => setShowProductPicker(true)}
                                  className="flex items-center gap-1 px-2 py-1 bg-[#f4991a] hover:bg-orange-500 text-white text-[10px] font-bold rounded-lg transition-all">
                                  <Plus size={9} /> Catalog
                                </button>
                              )}
                              <button onClick={addCustomItem}
                                className="flex items-center gap-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold rounded-lg transition-all">
                                <Plus size={9} /> Custom
                              </button>
                              <button onClick={cancelEditItems}
                                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-600 text-[10px] font-bold rounded-lg transition-all">
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {editItemsId === o.id ? (
                        /* Editing mode */
                        <div className="space-y-1.5">
                          {editItems.map((it: any, idx: number) => (
                            <div key={it._id || idx} className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-gray-100">
                              <div className="flex-1 min-w-0">
                                {it.product_id ? (
                                  <p className="text-xs font-bold text-[#1a1c3a] truncate">{it.name}</p>
                                ) : (
                                  <input value={it.name} onChange={e => updateItemName(idx, e.target.value)}
                                    placeholder="Product name..."
                                    className="w-full text-xs font-bold text-[#1a1c3a] bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-[#f4991a] pb-0.5" />
                                )}
                                {it.sku && <p className="text-[9px] text-gray-400 font-mono mt-0.5">{it.sku}</p>}
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateItemQty(idx, (it.quantity || 1) - 1)} className="w-5 h-5 rounded bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-bold hover:bg-gray-200">-</button>
                                <span className="text-xs font-bold text-[#1a1c3a] min-w-[16px] text-center">{it.quantity || 1}</span>
                                <button onClick={() => updateItemQty(idx, (it.quantity || 1) + 1)} className="w-5 h-5 rounded bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-bold hover:bg-gray-200">+</button>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-gray-400">KES</span>
                                <input type="number" value={it.unit_price || ''} onChange={e => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                                  className="w-16 px-1.5 py-1 border border-gray-200 rounded text-xs font-bold text-[#f4991a] text-right focus:outline-none focus:ring-1 focus:ring-[#f4991a]/30 focus:border-[#f4991a]" min={0} />
                              </div>
                              <button onClick={() => removeItem(idx)} className="w-6 h-6 rounded bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ))}
                          {editItems.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-3">No items. Add from catalog or custom.</p>
                          )}
                          <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-xs font-bold">
                              <span className="text-gray-600">Total: </span>
                              <span className="text-[#f4991a]">KES {editItemsTotal.toLocaleString()}</span>
                            </div>
                            {itemsChanged && (
                              <button onClick={saveItems} disabled={savingItems}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg transition-all">
                                <Save size={10} /> {savingItems ? 'Saving...' : 'Save changes'}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <div className="space-y-1.5">
                          {(Array.isArray(o.items) ? o.items : []).map((it: any, i: number) => (
                            <div key={i} className="flex items-center gap-2.5 bg-white rounded-lg p-2.5 border border-gray-100">
                              <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {it.image_url ? <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" /> : <Package size={16} className="text-gray-300" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#1a1c3a] truncate">{it.name || 'Item'}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {it.sku && <span className="text-[9px] text-gray-400 font-mono">{it.sku}</span>}
                                  {(it.unit_price || 0) > 0 && <span className="text-[9px] text-gray-400">Unit: KES {it.unit_price.toLocaleString()}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-xs text-gray-500 font-medium">x{it.quantity || 1}</span>
                                {((it.unit_price || 0) * (it.quantity || 1)) > 0 && (
                                  <span className="text-xs font-bold text-[#f4991a]">KES {((it.unit_price || 0) * (it.quantity || 1)).toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          ))}
                          {(o.total_amount || 0) > 0 && (
                            <div className="pt-1 flex justify-end text-xs font-bold">
                              <span className="text-[#f4991a]">Total: KES {o.total_amount.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Product picker modal */}
                {showProductPicker && editItemsId === o.id && (
                  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col">
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-[#1a1c3a]">Add Product from Catalog</h3>
                        <button onClick={() => { setShowProductPicker(false); setProductSearch('') }} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                          <X size={15} className="text-gray-500" />
                        </button>
                      </div>
                      <div className="px-5 py-3 border-b border-gray-50">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                            placeholder="Search products..." autoFocus
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20" />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-5 space-y-2">
                        {filteredSellerProducts.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-8">No products found</p>
                        ) : filteredSellerProducts.map((p: any) => {
                          const alreadyAdded = editItems.some((it: any) => it.product_id === p.id)
                          return (
                            <button key={p.id} onClick={() => !alreadyAdded && addSellerProduct(p)} disabled={alreadyAdded}
                              className={cn('w-full flex items-center gap-3 p-3 border rounded-xl text-left transition-all',
                                alreadyAdded ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:border-[#f4991a]/60 hover:bg-orange-50/30')}>
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-50 to-blue-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <Package size={16} className="text-gray-300" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#1a1c3a] truncate">{p.name}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{p.sku} · Stock: {p.stock}</p>
                              </div>
                              <span className="text-xs font-bold text-[#f4991a]">KES {(p.selling_price || 0).toLocaleString()}</span>
                              {alreadyAdded && <span className="text-[9px] text-emerald-600 font-bold">Added</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
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
