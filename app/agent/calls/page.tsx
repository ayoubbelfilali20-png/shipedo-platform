'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { decrementStockForOrderItems } from '@/lib/stock'
import { cn } from '@/lib/utils'
import { detectDuplicates } from '@/lib/detectDuplicates'
import {
  Phone, CheckCircle, XCircle, Clock, MapPin, Package,
  AlertCircle, Calendar, MessageSquare, PhoneOff, MessageCircle,
  Printer, Pencil, Save, X, CheckSquare, Square, Plus, Trash2, Search,
} from 'lucide-react'
import { printOrderLabel, printOrderLabels, type PrintLabelProps } from '@/components/PrintLabel'

type OrderRow = {
  id: string
  tracking_number: string
  customer_name: string
  customer_phone: string
  customer_city: string
  customer_address: string
  items: any[]
  total_amount: number
  original_total?: number | null
  status: string
  payment_method?: string
  notes?: string | null
  call_attempts?: number | null
  reminded_at?: string | null
  last_call_note?: string | null
  cancel_reason?: string | null
  created_at: string
  seller_id?: string | null
}

function cleanPhone(p: string) {
  let num = (p || '').replace(/[^\d+]/g, '')
  // Convert Kenyan local format (07XX / 01XX) to international (2547XX / 2541XX)
  if (/^0[17]\d{8}$/.test(num)) num = '254' + num.slice(1)
  return num
}

function whatsappUrl(phone: string, text: string) {
  const num = cleanPhone(phone).replace(/^\+/, '')
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}
function openWhatsApp(phone: string, text: string) {
  window.location.href = whatsappUrl(phone, text)
}

async function logWhatsAppContact(orderId: string, agentId: string, agentName: string, customerName: string) {
  try {
    await supabase.from('call_logs').insert({
      order_id: orderId,
      agent_id: agentId,
      agent_name: agentName,
      action: 'whatsapp_contact',
      note: `WhatsApp message sent to ${customerName}`,
    })
  } catch {}
}

export default function AgentCallsPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agentName, setAgentName] = useState('')
  const [note, setNote] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [showReschedule, setShowReschedule] = useState(false)
  const [waText, setWaText] = useState('')
  const [busy, setBusy] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState<string>('')
  const [cancelOther, setCancelOther] = useState('')

  // Editable customer fields
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editCity, setEditCity] = useState('')

  // Client history + duplicate detection
  const [clientHistory, setClientHistory] = useState<OrderRow[]>([])
  const [isDuplicate, setIsDuplicate] = useState(false)

  // Editable items
  const [editItems, setEditItems] = useState<any[]>([])
  const [editingItems, setEditingItems] = useState(false)
  const [itemsChanged, setItemsChanged] = useState(false)
  const [sellerProducts, setSellerProducts] = useState<any[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [savingItems, setSavingItems] = useState(false)

  // Print queue — manual select
  const [printQueue, setPrintQueue] = useState<Set<string>>(new Set())

  const CANCEL_REASONS = [
    'Wrong number',
    'Client refused the product',
    'Price too high',
    'Duplicate order',
    'Already bought elsewhere',
    'Other',
  ]

  // Confirmed orders for the print sidebar
  const [confirmedOrders, setConfirmedOrders] = useState<OrderRow[]>([])

  const loadQueue = async (aid?: string | null) => {
    const id = aid ?? agentId
    if (!id) { setLoading(false); return }
    const res = await fetch('/api/agent/calls', { headers: { 'x-agent-id': id } })
    const { pending: data, confirmed: confData } = await res.json()
    const rows = ((data || []) as OrderRow[]).filter(o => o.status === 'pending')
    // Recalculate total from items if total_amount is 0 + backfill original_total
    rows.forEach(o => {
      if ((!o.total_amount || o.total_amount === 0) && Array.isArray(o.items)) {
        const calc = o.items.reduce((s: number, it: any) => s + (Number(it.unit_price || it.price || 0) * (Number(it.quantity) || 1)), 0)
        if (calc > 0) o.total_amount = calc
      }
      // Backfill original_total for existing orders that don't have it
      if (!o.original_total && o.total_amount > 0) {
        o.original_total = o.total_amount
        supabase.from('orders').update({ original_total: o.total_amount }).eq('id', o.id).then(() => {})
      }
    })
    // Sort: new orders first (never called), then reminded/unreached
    rows.sort((a, b) => {
      const aNew = !a.call_attempts || a.call_attempts === 0
      const bNew = !b.call_attempts || b.call_attempts === 0
      if (aNew && !bNew) return -1
      if (!aNew && bNew) return 1
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    setOrders(rows)
    setConfirmedOrders((confData || []) as OrderRow[])
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
          loadQueue(parsed.id)
          return
        }
      }
    } catch {}
    setLoading(false)
  }, [])

  // Auto-refresh every 30s to pick up reminded orders when their time arrives
  useEffect(() => {
    if (!agentId) return
    const interval = setInterval(() => loadQueue(agentId), 30_000)
    return () => clearInterval(interval)
  }, [agentId])

  const order = orders[0] ?? null
  const pendingCount = orders.length
  const duplicateMap = useMemo(() => detectDuplicates(orders), [orders])

  useEffect(() => {
    if (!order) return

    // Build product list for WhatsApp message
    const items = Array.isArray(order.items) ? order.items : []
    const productList = items.map((it: any) => {
      const qty = Number(it.quantity) || 1
      return qty > 1 ? `${it.name || 'Item'} (x${qty})` : (it.name || 'Item')
    }).join(', ')
    const agentFirst = agentName.split(' ')[0] || 'Agent'

    setWaText(`Hello 👋 ${order.customer_name}, this is ${agentFirst} from Shipedo.\nWe received your order *${order.tracking_number}* for ${productList}.\nI'm just calling to confirm your details before delivery 🚚.`)
    setNote('')
    setRescheduleDate('')
    setShowReschedule(false)
    setShowCancel(false)
    setCancelReason('')
    setCancelOther('')
    setEditing(false)
    setEditName(order.customer_name)
    setEditPhone(order.customer_phone)
    setEditAddress(order.customer_address)
    setEditCity(order.customer_city)

    // Init editable items & enrich with product images
    const initItems = items.map((it: any, i: number) => ({ ...it, _id: `${Date.now()}-${i}` }))
    setEditItems(initItems)
    setEditingItems(false)
    setItemsChanged(false)

    // Load seller products for adding + enrich item images
    if (order.seller_id) {
      supabase.from('products').select('id, name, sku, selling_price, stock, image_url')
        .eq('seller_id', order.seller_id).eq('status', 'active')
        .then(({ data }) => {
          const prods = (data || []) as any[]
          setSellerProducts(prods)
          // Enrich items missing image_url
          const imgMap = new Map(prods.map((p: any) => [p.id, p.image_url]))
          setEditItems(prev => prev.map(it => it.product_id && !it.image_url && imgMap.has(it.product_id)
            ? { ...it, image_url: imgMap.get(it.product_id) } : it))
        })
    } else {
      setSellerProducts([])
    }

    // Load client history by phone number
    const phone = order.customer_phone?.trim()
    if (phone) {
      supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', phone)
        .neq('id', order.id)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          const history = (data || []) as OrderRow[]
          setClientHistory(history)
          // Detect duplicate: same phone + same product names
          const currentProducts = items.map((it: any) => (it.name || '').toLowerCase()).sort().join('|')
          const dup = history.some(h => {
            const hItems = Array.isArray(h.items) ? h.items : []
            const hProducts = hItems.map((it: any) => (it.name || '').toLowerCase()).sort().join('|')
            return hProducts === currentProducts && ['pending', 'confirmed', 'prepared', 'shipped_to_agent', 'shipped'].includes(h.status)
          })
          setIsDuplicate(dup)
        })
    } else {
      setClientHistory([])
      setIsDuplicate(false)
    }
  }, [order?.id, agentName])

  // Item editing
  const updateItemPrice = (idx: number, price: number) => {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_price: price } : it))
    setItemsChanged(true)
  }
  const updateItemQty = (idx: number, qty: number) => {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, qty) } : it))
    setItemsChanged(true)
  }
  const removeItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx))
    setItemsChanged(true)
  }
  const addSellerProduct = (p: any) => {
    setEditItems(prev => [...prev, {
      _id: `${Date.now()}`,
      product_id: p.id,
      name: p.name,
      sku: p.sku || '',
      image_url: p.image_url || '',
      quantity: 1,
      unit_price: p.selling_price || 0,
    }])
    setItemsChanged(true)
    setShowProductPicker(false)
    setProductSearch('')
  }
  const addCustomItem = () => {
    setEditItems(prev => [...prev, {
      _id: `${Date.now()}`,
      product_id: null,
      name: '',
      sku: '',
      quantity: 1,
      unit_price: 0,
    }])
    setItemsChanged(true)
  }
  const updateItemName = (idx: number, name: string) => {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, name } : it))
    setItemsChanged(true)
  }
  const editItemsTotal = editItems.reduce((a: number, it: any) => a + (Number(it.unit_price) || 0) * (Number(it.quantity) || 0), 0)

  const saveItems = async () => {
    if (!order) return
    setSavingItems(true)
    const cleanItems = editItems.map(({ _id, ...rest }: any) => rest)
    await supabase.from('orders').update({ items: cleanItems, total_amount: editItemsTotal }).eq('id', order.id)
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, items: cleanItems, total_amount: editItemsTotal } : o))
    setItemsChanged(false)
    setSavingItems(false)
  }

  const filteredSellerProducts = sellerProducts.filter(p => {
    const q = productSearch.toLowerCase()
    return !q || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
  })

  const saveEdits = async () => {
    if (!order) return
    setBusy(true)
    await supabase.from('orders').update({
      customer_name: editName,
      customer_phone: editPhone,
      customer_address: editAddress,
      customer_city: editCity,
    }).eq('id', order.id)
    // Update local state
    setOrders(prev => prev.map(o => o.id === order.id ? {
      ...o,
      customer_name: editName,
      customer_phone: editPhone,
      customer_address: editAddress,
      customer_city: editCity,
    } : o))
    setEditing(false)
    setBusy(false)
  }

  const submit = async (action: 'confirmed' | 'not_reached' | 'cancelled' | 'rescheduled') => {
    if (!order || busy) return
    setBusy(true)

    // If editing, save edits first
    if (editing) {
      await supabase.from('orders').update({
        customer_name: editName,
        customer_phone: editPhone,
        customer_address: editAddress,
        customer_city: editCity,
      }).eq('id', order.id)
    }

    const nowIso = new Date().toISOString()
    const patch: any = {
      last_call_at: nowIso,
      last_call_note: note || null,
      last_call_agent_id: agentId,
      call_attempts: (order.call_attempts || 0) + 1,
    }

    // Only save items/total if agent manually edited them (price negotiation / discount)
    const cleanItems = editItems.map(({ _id, ...rest }: any) => rest)
    if (itemsChanged) {
      patch.items = cleanItems
      patch.total_amount = editItemsTotal
    }
    let logRemindedAt: string | null = null
    if (action === 'confirmed') {
      patch.status = 'confirmed'
      patch.reminded_at = null
      await decrementStockForOrderItems(cleanItems as any[])
    } else if (action === 'cancelled') {
      const reasonFinal = cancelReason === 'Other' ? (cancelOther.trim() || 'Other') : cancelReason
      if (!reasonFinal) { setBusy(false); return }
      patch.status = 'cancelled'
      patch.reminded_at = null
      patch.cancel_reason = reasonFinal
    } else if (action === 'rescheduled') {
      if (!rescheduleDate) { setBusy(false); return }
      patch.status = 'pending'
      patch.reminded_at = new Date(rescheduleDate).toISOString()
      logRemindedAt = patch.reminded_at
    } else if (action === 'not_reached') {
      patch.status = 'pending'
      const attempts = (order.call_attempts || 0) + 1
      let remindDate: Date
      if (attempts <= 1) {
        // 1st unreached → retry after 1 hour
        remindDate = new Date(Date.now() + 1 * 60 * 60 * 1000)
      } else if (attempts === 2) {
        // 2nd unreached → retry after 2 hours
        remindDate = new Date(Date.now() + 2 * 60 * 60 * 1000)
      } else {
        // 3rd+ unreached → retry next day at 9am
        remindDate = new Date()
        remindDate.setDate(remindDate.getDate() + 1)
        remindDate.setHours(9, 0, 0, 0)
      }
      patch.reminded_at = remindDate.toISOString()
      logRemindedAt = patch.reminded_at
    }
    await supabase.from('orders').update(patch).eq('id', order.id)

    let agentName: string | null = null
    try {
      const u = localStorage.getItem('shipedo_agent')
      if (u) agentName = JSON.parse(u).name || null
    } catch {}
    const cancelReasonFinal = action === 'cancelled'
      ? (cancelReason === 'Other' ? (cancelOther.trim() || 'Other') : cancelReason)
      : null
    await supabase.from('call_logs').insert({
      order_id: order.id,
      agent_id: agentId,
      agent_name: agentName,
      action,
      note: note || null,
      reminded_at: logRemindedAt,
      cancel_reason: cancelReasonFinal,
    })

    // Immediately remove from queue so cancelled/confirmed orders disappear instantly
    if (action === 'cancelled' || action === 'confirmed') {
      setOrders(prev => prev.filter(o => o.id !== order.id))
    }

    setBusy(false)
    await loadQueue(agentId)
  }

  // Print helpers — manual select from confirmed orders
  const togglePrintQueue = (id: string) => {
    setPrintQueue(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const toggleSelectAll = () => {
    setPrintQueue(prev => prev.size === confirmedOrders.length ? new Set() : new Set(confirmedOrders.map(o => o.id)))
  }
  const queuedOrders = confirmedOrders.filter(o => printQueue.has(o.id))
  const orderToLabel = (o: OrderRow): PrintLabelProps => ({
    id: o.id,
    tracking: o.tracking_number,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    customerAddress: o.customer_address,
    customerCity: o.customer_city,
    items: Array.isArray(o.items) ? o.items : [],
    totalAmount: o.total_amount,
    paymentMethod: o.payment_method || 'COD',
  })
  const doPrint = async (ids: string[]) => {
    const toPrint = confirmedOrders.filter(o => ids.includes(o.id))
    if (toPrint.length === 0) return
    printOrderLabels(toPrint.map(orderToLabel))
    await Promise.all(ids.map(id => supabase.from('orders').update({ printed: true }).eq('id', id)))
    setConfirmedOrders(prev => prev.filter(o => !ids.includes(o.id)))
    setPrintQueue(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
  }

  const inputCls = "w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-[#1a1c3a] text-lg">Call Queue</h1>
          <p className="text-xs text-gray-400 mt-0.5">{pendingCount} order(s) waiting</p>
        </div>
        <button
          onClick={() => { setLoading(true); loadQueue(agentId) }}
          className="text-xs font-semibold text-[#f4991a] hover:text-orange-600"
        >
          Refresh
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main calling area */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center text-sm text-gray-400">
              Loading queue…
            </div>
          ) : !order ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h2 className="font-bold text-[#1a1c3a] text-lg mb-1">All clear!</h2>
              <p className="text-sm text-gray-400">No pending calls right now. Reminded orders will reappear when due.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-[#1a1c3a] px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Now Calling</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-bold text-lg font-mono">{order.tracking_number}</p>
                    {(order.call_attempts ?? 0) > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${(order.call_attempts ?? 0) >= 3 ? 'bg-red-500 text-white' : (order.call_attempts ?? 0) >= 2 ? 'bg-orange-400 text-white' : 'bg-yellow-400 text-gray-800'}`}>
                        x{order.call_attempts}
                      </span>
                    )}
                    {duplicateMap.get(order.id)?.isDuplicate && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">DUPLICATE</span>
                    )}
                  </div>
                </div>
                <span className="text-white/30 text-xs">{pendingCount - 1} more after this</span>
              </div>

              <div className="p-6 space-y-4">
                {/* Customer info — editable */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center font-bold text-[#1a1c3a]">
                        {(editing ? editName : order.customer_name || '?')[0]}
                      </div>
                      <div className="min-w-0">
                        {!editing ? (
                          <>
                            <p className="font-bold text-[#1a1c3a] text-sm truncate">{order.customer_name}</p>
                            <p className="text-xs text-gray-500">{order.customer_phone}</p>
                          </>
                        ) : (
                          <p className="text-xs font-semibold text-blue-600">Editing customer info</p>
                        )}
                      </div>
                    </div>
                    {!editing ? (
                      <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg transition-all">
                        <Pencil size={11} /> Edit
                      </button>
                    ) : (
                      <div className="flex gap-1.5">
                        <button onClick={() => { setEditing(false); setEditName(order.customer_name); setEditPhone(order.customer_phone); setEditAddress(order.customer_address); setEditCity(order.customer_city) }} className="px-2.5 py-1.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-lg hover:bg-gray-200">
                          Cancel
                        </button>
                        <button disabled={busy} onClick={saveEdits} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                          <Save size={11} /> Save
                        </button>
                      </div>
                    )}
                  </div>

                  {editing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Name</label>
                          <input value={editName} onChange={e => setEditName(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Phone</label>
                          <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className={inputCls} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Address</label>
                        <input value={editAddress} onChange={e => setEditAddress(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">City</label>
                        <input value={editCity} onChange={e => setEditCity(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                        <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                        {order.customer_address}, {order.customer_city}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`tel:${cleanPhone(order.customer_phone)}`}
                          className="flex items-center justify-center gap-1.5 py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-all"
                        >
                          <Phone size={13} /> Call
                        </a>
                        <button
                          onClick={() => {
                            openWhatsApp(order.customer_phone, waText)
                            logWhatsAppContact(order.id, agentId || '', agentName, order.customer_name)
                          }}
                          className="flex items-center justify-center gap-1.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all"
                        >
                          <MessageCircle size={13} /> WhatsApp
                        </button>
                      </div>
                    </>
                  )}

                  {(order.call_attempts || 0) > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-orange-500">
                      <AlertCircle size={11} />
                      {order.call_attempts} previous attempt{(order.call_attempts || 0) > 1 ? 's' : ''}
                    </div>
                  )}
                  {order.reminded_at && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-indigo-500">
                      <Clock size={11} /> Reminder was set: {new Date(order.reminded_at).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Duplicate warning */}
                {isDuplicate && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-700">Duplicate order detected</p>
                      <p className="text-[10px] text-red-500">This client already has an active order with the same products. Consider cancelling as duplicate.</p>
                    </div>
                  </div>
                )}

                {/* Client history */}
                {clientHistory.length > 0 && (() => {
                  const delivered = clientHistory.filter(h => h.status === 'delivered').length
                  const returned = clientHistory.filter(h => h.status === 'returned').length
                  const cancelled = clientHistory.filter(h => h.status === 'cancelled').length
                  const shippedToAgent = clientHistory.filter(h => h.status === 'shipped_to_agent').length
                  const shipped = clientHistory.filter(h => h.status === 'shipped').length
                  const trustScore = delivered > 0 && returned === 0 ? 'good' : returned > delivered ? 'risky' : 'neutral'
                  return (
                    <div className={cn('border rounded-xl p-3', trustScore === 'good' ? 'bg-emerald-50 border-emerald-200' : trustScore === 'risky' ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-200')}>
                      <div className="flex items-center justify-between mb-2">
                        <p className={cn('text-[10px] font-bold uppercase tracking-wide flex items-center gap-1', trustScore === 'good' ? 'text-emerald-700' : trustScore === 'risky' ? 'text-red-700' : 'text-purple-700')}>
                          <Clock size={10} /> Returning client
                        </p>
                        <div className="flex items-center gap-1.5">
                          {shippedToAgent > 0 && <span className="text-[9px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">{shippedToAgent} sent to agent</span>}
                          {shipped > 0 && <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">{shipped} shipped</span>}
                          {delivered > 0 && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">{delivered} delivered</span>}
                          {returned > 0 && <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">{returned} returned</span>}
                          {cancelled > 0 && <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{cancelled} cancelled</span>}
                        </div>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {clientHistory.map(h => {
                          const hItems = Array.isArray(h.items) ? h.items : []
                          const statusColor: Record<string, string> = {
                            pending: 'text-yellow-600 bg-yellow-50', confirmed: 'text-emerald-600 bg-emerald-50',
                            prepared: 'text-indigo-600 bg-indigo-50', shipped_to_agent: 'text-purple-600 bg-purple-50',
                            shipped: 'text-blue-600 bg-blue-50',
                            delivered: 'text-sky-600 bg-sky-50', returned: 'text-red-600 bg-red-50',
                            cancelled: 'text-gray-500 bg-gray-50',
                          }
                          const statusLabel: Record<string, string> = {
                            pending: 'Pending', confirmed: 'Confirmed', prepared: 'Prepared',
                            shipped_to_agent: 'Sent to Agent', shipped: 'Shipped',
                            delivered: 'Delivered', returned: 'Returned', cancelled: 'Cancelled',
                          }
                          const d = new Date(h.created_at)
                          const ago = Math.floor((Date.now() - d.getTime()) / 86400000)
                          const timeLabel = ago === 0 ? 'today' : ago === 1 ? 'yesterday' : `${ago}d ago`
                          return (
                            <div key={h.id} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-gray-100 text-[10px]">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono font-bold text-[#1a1c3a]">{h.tracking_number}</span>
                                <span className="text-gray-400 truncate">{hItems.map((it: any) => it.name || 'Item').join(', ')}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[9px] text-gray-400">{timeLabel}</span>
                                <span className={cn('px-1.5 py-0.5 rounded font-bold', statusColor[h.status] || 'text-gray-500 bg-gray-50')}>
                                  {statusLabel[h.status] || h.status}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {clientHistory.length === 0 && order && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-2.5 flex items-center gap-2">
                    <CheckCircle size={12} className="text-green-500" />
                    <p className="text-[10px] font-semibold text-green-700">New client &middot; First order</p>
                  </div>
                )}

                {/* Order details */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Package size={12} /> Order Items ({editItems.length})
                    </p>
                    {!editingItems ? (
                      <button onClick={() => setEditingItems(true)}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold rounded-lg transition-all">
                        <Pencil size={9} /> Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {sellerProducts.length > 0 && (
                          <button onClick={() => setShowProductPicker(true)}
                            className="flex items-center gap-1 px-2 py-1 bg-[#f4991a] hover:bg-orange-500 text-white text-[10px] font-bold rounded-lg transition-all">
                            <Plus size={10} /> From catalog
                          </button>
                        )}
                        <button onClick={addCustomItem}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold rounded-lg transition-all">
                          <Plus size={10} /> Custom
                        </button>
                        <button onClick={() => { setEditingItems(false); setEditItems((Array.isArray(order.items) ? order.items : []).map((it: any, i: number) => ({ ...it, _id: `r-${i}` }))); setItemsChanged(false) }}
                          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-600 text-[10px] font-bold rounded-lg transition-all">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {!editingItems ? (
                    /* ── Read-only view ── */
                    <div className="space-y-1.5">
                      {editItems.map((it: any, idx: number) => (
                        <div key={it._id || idx} className="flex items-center gap-2.5 bg-white rounded-lg p-2.5 border border-gray-100">
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
                    </div>
                  ) : (
                    /* ── Edit mode ── */
                    <div className="space-y-1.5">
                      {editItems.map((it: any, idx: number) => (
                        <div key={it._id || idx} className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-orange-200">
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
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                    {(editingItems ? editItemsTotal : (order.total_amount || 0)) > 0 ? (
                      <div className="text-xs font-bold flex items-center gap-2">
                        <span className="text-gray-600">Total: </span>
                        <span className="text-[#f4991a]">KES {editingItems ? editItemsTotal.toLocaleString() : (order.total_amount || 0).toLocaleString()}</span>
                        {order.original_total && order.original_total !== order.total_amount && order.original_total > 0 && (
                          <span className="text-[10px] text-gray-400 line-through">KES {order.original_total.toLocaleString()}</span>
                        )}
                      </div>
                    ) : <div />}
                    {itemsChanged && editingItems && (
                      <button onClick={saveItems} disabled={savingItems}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg transition-all">
                        <Save size={10} /> {savingItems ? 'Saving...' : 'Save changes'}
                      </button>
                    )}
                  </div>

                  {order.notes && (
                    <div className="flex items-start gap-1 text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mt-2">
                      <AlertCircle size={11} className="mt-0.5" />
                      {order.notes}
                    </div>
                  )}
                  {order.last_call_note && (
                    <div className="text-xs text-gray-500 bg-white rounded-lg p-2 mt-2 border border-gray-100">
                      <span className="font-semibold text-gray-600">Last note:</span> {order.last_call_note}
                    </div>
                  )}
                </div>

                {/* Product picker modal */}
                {showProductPicker && (
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
                        ) : filteredSellerProducts.map(p => {
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

                {/* WhatsApp message editor */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                    <MessageCircle size={12} /> WhatsApp message
                  </label>
                  <textarea
                    value={waText}
                    onChange={e => setWaText(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"
                  />
                </div>

                {/* Call note */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                    <MessageSquare size={12} /> Call note
                  </label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="What happened on this call..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] resize-none"
                  />
                </div>

                {/* Reschedule picker */}
                {showReschedule && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-blue-700">Remind me to call again on</p>
                    <input
                      type="datetime-local"
                      value={rescheduleDate}
                      onChange={e => setRescheduleDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button disabled={busy} onClick={() => submit('confirmed')} className="flex flex-col items-center gap-1.5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50">
                    <CheckCircle size={18} /> Confirm
                  </button>
                  <button disabled={busy} onClick={() => submit('not_reached')} className="flex flex-col items-center gap-1.5 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-bold text-xs transition-all disabled:opacity-50">
                    <PhoneOff size={18} /> Unreached
                  </button>
                  <button disabled={busy} onClick={() => setShowReschedule(v => !v)} className="flex flex-col items-center gap-1.5 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 rounded-xl font-bold text-xs transition-all disabled:opacity-50">
                    <Calendar size={18} /> Remind
                  </button>
                  <button disabled={busy} onClick={() => setShowCancel(true)} className="flex flex-col items-center gap-1.5 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 rounded-xl font-bold text-xs transition-all disabled:opacity-50">
                    <XCircle size={18} /> Cancel
                  </button>
                </div>

                {/* Cancel reason modal */}
                {showCancel && (
                  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-[#1a1c3a]">Cancel order</h3>
                          <p className="text-[11px] text-gray-400 mt-0.5">Pick a reason — the admin will see it.</p>
                        </div>
                        <button onClick={() => { setShowCancel(false); setCancelReason(''); setCancelOther('') }} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                          <XCircle size={15} className="text-gray-500" />
                        </button>
                      </div>
                      <div className="p-5 space-y-2">
                        {CANCEL_REASONS.map(r => (
                          <button
                            key={r}
                            onClick={() => setCancelReason(r)}
                            className={cn(
                              'w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                              cancelReason === r
                                ? 'bg-red-50 border-red-300 text-red-700'
                                : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'
                            )}
                          >
                            {r}
                          </button>
                        ))}
                        {cancelReason === 'Other' && (
                          <textarea
                            value={cancelOther}
                            onChange={e => setCancelOther(e.target.value)}
                            placeholder="Describe the reason…"
                            rows={2}
                            className="w-full mt-2 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
                          />
                        )}
                      </div>
                      <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                        <button
                          onClick={() => { setShowCancel(false); setCancelReason(''); setCancelOther('') }}
                          className="flex-1 py-2.5 border border-gray-200 text-gray-500 text-sm font-bold rounded-xl hover:bg-gray-50"
                        >
                          Back
                        </button>
                        <button
                          disabled={busy || !cancelReason || (cancelReason === 'Other' && !cancelOther.trim())}
                          onClick={async () => { await submit('cancelled'); setShowCancel(false) }}
                          className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl"
                        >
                          Confirm cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showReschedule && rescheduleDate && (
                  <button disabled={busy} onClick={() => submit('rescheduled')} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50">
                    Save Reminder
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Up next */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-[#1a1c3a] text-sm mb-3">Up Next ({Math.max(0, pendingCount - 1)})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {orders.slice(1, 12).map((o, i) => {
                const dup = duplicateMap.get(o.id)
                return (
                  <div key={o.id} className={cn('flex items-center gap-2.5 p-2.5 rounded-xl', dup?.isDuplicate ? 'bg-red-50 border border-red-200' : 'bg-gray-50')}>
                    <span className="w-5 h-5 rounded-full bg-[#1a1c3a]/10 text-[#1a1c3a] text-xs font-bold flex items-center justify-center">{i + 2}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold text-[#1a1c3a] truncate">{o.customer_name}</p>
                        {dup?.isDuplicate && <span className="text-[8px] font-bold text-red-600 bg-red-100 px-1 py-0.5 rounded flex-shrink-0">DUP</span>}
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono">{o.tracking_number}</p>
                      {o.reminded_at && (
                        <p className="text-[9px] text-indigo-500 flex items-center gap-0.5 mt-0.5">
                          <Clock size={8} /> {new Date(o.reminded_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    {(o.call_attempts || 0) > 0 && (
                      <span className="text-[10px] font-semibold text-orange-500">×{o.call_attempts}</span>
                    )}
                  </div>
                )
              })}
              {pendingCount === 0 && <p className="text-xs text-gray-400 text-center py-4">Empty</p>}
            </div>
          </div>

          {/* Print Orders — below call history */}
          <div className="bg-blue-50 rounded-2xl border border-blue-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                <Printer size={14} /> Print Orders ({confirmedOrders.length})
              </h3>
              {confirmedOrders.length > 0 && (
                <button onClick={toggleSelectAll} className="text-[10px] font-bold text-blue-600 hover:text-blue-800">
                  {printQueue.size === confirmedOrders.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            {confirmedOrders.length === 0 ? (
              <p className="text-xs text-blue-400 text-center py-4">Confirmed orders will appear here for printing.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {confirmedOrders.map(o => (
                  <div key={o.id} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-blue-100">
                    <button onClick={() => togglePrintQueue(o.id)} className="text-blue-500 flex-shrink-0">
                      {printQueue.has(o.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1a1c3a] truncate">{o.customer_name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{o.tracking_number}</p>
                      <p className="text-[10px] text-gray-400">{o.customer_city}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {queuedOrders.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => doPrint(queuedOrders.map(o => o.id))}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
                >
                  <Printer size={12} /> Print selected ({queuedOrders.length})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
