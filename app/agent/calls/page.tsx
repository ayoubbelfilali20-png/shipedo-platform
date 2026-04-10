'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { decrementStockForOrderItems } from '@/lib/stock'
import { cn } from '@/lib/utils'
import {
  Phone, CheckCircle, XCircle, Clock, MapPin, Package,
  AlertCircle, Calendar, MessageSquare, PhoneOff, MessageCircle
} from 'lucide-react'
import OrderItemsDetails from '@/components/OrderItemsDetails'
import { printOrderLabel } from '@/components/PrintLabel'

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
  last_call_note?: string | null
  cancel_reason?: string | null
  created_at: string
}

function cleanPhone(p: string) {
  return (p || '').replace(/[^\d+]/g, '')
}

function whatsappLink(phone: string, text: string) {
  const num = cleanPhone(phone).replace(/^\+/, '')
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}

export default function AgentCallsPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [showReschedule, setShowReschedule] = useState(false)
  const [waText, setWaText] = useState('')
  const [busy, setBusy] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState<string>('')
  const [cancelOther, setCancelOther] = useState('')

  const CANCEL_REASONS = [
    'Wrong number',
    'Client refused the product',
    'Price too high',
    'Duplicate order',
    'Already bought elsewhere',
    'Other',
  ]

  // load queue — only orders assigned to this agent
  const loadQueue = async (aid?: string | null) => {
    const id = aid ?? agentId
    if (!id) { setLoading(false); return }
    const nowIso = new Date().toISOString()
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .eq('assigned_agent_id', id)
      .or(`reminded_at.is.null,reminded_at.lte.${nowIso}`)
      .order('created_at', { ascending: true })
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
          loadQueue(parsed.id)
          return
        }
      }
    } catch {}
    setLoading(false)
  }, [])

  const order = orders[0] ?? null
  const pendingCount = orders.length

  useEffect(() => {
    if (order) {
      setWaText(`Hello ${order.customer_name}, this is Shipedo regarding your order ${order.tracking_number}. Could you please confirm your delivery details?`)
      setNote('')
      setRescheduleDate('')
      setShowReschedule(false)
      setShowCancel(false)
      setCancelReason('')
      setCancelOther('')
    }
  }, [order?.id])

  const submit = async (action: 'confirmed' | 'not_reached' | 'cancelled' | 'rescheduled') => {
    if (!order || busy) return
    setBusy(true)
    const nowIso = new Date().toISOString()
    const patch: any = {
      last_call_at: nowIso,
      last_call_note: note || null,
      last_call_agent_id: agentId,
      call_attempts: (order.call_attempts || 0) + 1,
    }
    let logRemindedAt: string | null = null
    if (action === 'confirmed') {
      patch.status = 'confirmed'
      patch.reminded_at = null
      await decrementStockForOrderItems(order.items as any[])
      // Auto-print shipping label
      printOrderLabel({
        tracking: order.tracking_number,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerAddress: order.customer_address,
        customerCity: order.customer_city,
        items: Array.isArray(order.items) ? order.items : [],
        totalAmount: order.total_amount,
        paymentMethod: 'COD',
      })
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
      // attempts-based bump: 1st = 1h, 2nd+ = 2h. No WhatsApp auto-open.
      const attempts = (order.call_attempts || 0) + 1
      const delayMs = attempts <= 1 ? 60 * 60 * 1000 : 2 * 60 * 60 * 1000
      patch.reminded_at = new Date(Date.now() + delayMs).toISOString()
      logRemindedAt = patch.reminded_at
    }
    await supabase.from('orders').update(patch).eq('id', order.id)

    // Append a row to call_logs (full history)
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

    setBusy(false)
    await loadQueue(agentId)
  }

  const statTotalToday = useMemo(() => orders.length, [orders])

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
                  <p className="text-white font-bold text-lg font-mono">{order.tracking_number}</p>
                </div>
                <span className="text-white/30 text-xs">{pendingCount - 1} more after this</span>
              </div>

              <div className="p-6 space-y-4">
                {/* Customer + actions */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center font-bold text-[#1a1c3a]">
                        {(order.customer_name || '?')[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#1a1c3a] text-sm truncate">{order.customer_name}</p>
                        <p className="text-xs text-gray-500">{order.customer_phone}</p>
                      </div>
                    </div>
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
                      <a
                        href={whatsappLink(order.customer_phone, waText)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                    </div>
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

                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Package size={12} /> Order Details
                    </p>
                    <OrderItemsDetails
                      items={Array.isArray(order.items) ? order.items : []}
                      showSeller
                    />
                    <div className="pt-2 border-t border-gray-200 flex justify-between text-xs font-bold">
                      <span className="text-gray-600">Total</span>
                      <span className="text-[#f4991a]">KES {(order.total_amount || 0).toLocaleString()}</span>
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
                </div>

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

        {/* Up next */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-[#1a1c3a] text-sm mb-3">Up Next ({Math.max(0, pendingCount - 1)})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {orders.slice(1, 12).map((o, i) => (
                <div key={o.id} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-[#1a1c3a]/10 text-[#1a1c3a] text-xs font-bold flex items-center justify-center">{i + 2}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1a1c3a] truncate">{o.customer_name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{o.tracking_number}</p>
                  </div>
                  {(o.call_attempts || 0) > 0 && (
                    <span className="text-[10px] font-semibold text-orange-500">×{o.call_attempts}</span>
                  )}
                </div>
              ))}
              {pendingCount === 0 && <p className="text-xs text-gray-400 text-center py-4">Empty</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
