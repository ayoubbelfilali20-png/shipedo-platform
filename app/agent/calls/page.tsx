'use client'

import { useState } from 'react'
import { mockOrders } from '@/lib/data'
import { Order } from '@/lib/types'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Phone, CheckCircle, XCircle, Clock, RotateCcw,
  MapPin, Package, User, AlertCircle, ChevronRight,
  Check, X, Calendar, MessageSquare, PhoneOff
} from 'lucide-react'

type CallResult = 'confirmed' | 'not_reached' | 'cancelled' | 'rescheduled' | null

interface CallEntry {
  result: CallResult
  note: string
  rescheduleDate?: string
}

const queue = mockOrders
  .filter(o => ['pending', 'confirmed'].includes(o.status))
  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

export default function AgentCallsPage() {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [calls, setCalls] = useState<Record<string, CallEntry>>({})
  const [note, setNote] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [showReschedule, setShowReschedule] = useState(false)
  const [done, setDone] = useState(false)

  const pending = queue.filter(o => !calls[o.id])
  const processed = queue.filter(o => calls[o.id])
  const order = pending[0] ?? null

  const submit = (result: Exclude<CallResult, null>) => {
    if (!order) return
    setCalls(prev => ({ ...prev, [order.id]: { result, note, rescheduleDate: result === 'rescheduled' ? rescheduleDate : undefined } }))
    setNote('')
    setRescheduleDate('')
    setShowReschedule(false)
    if (pending.length <= 1) setDone(true)
  }

  const resultConfig = {
    confirmed:   { label: 'Confirmed',   icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
    not_reached: { label: 'Not Reached', icon: PhoneOff,    color: 'text-red-600',     bg: 'bg-red-50',      border: 'border-red-200'     },
    cancelled:   { label: 'Cancelled',   icon: XCircle,     color: 'text-gray-600',    bg: 'bg-gray-100',    border: 'border-gray-200'     },
    rescheduled: { label: 'Rescheduled', icon: Calendar,    color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200'     },
  }

  const script = [
    `Greet the customer warmly`,
    `Confirm identity: "Am I speaking with [Customer Name]?"`,
    `State purpose: "Calling about your order [Tracking #]"`,
    `Confirm delivery address`,
    `Confirm availability / preferred delivery time`,
    `Thank and close the call`,
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-[#1a1c3a] text-lg">Call Queue</h1>
          <p className="text-xs text-gray-400 mt-0.5">{pending.length} remaining · {processed.length} done</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#f4991a] to-orange-400 rounded-full transition-all"
              style={{ width: `${queue.length > 0 ? (processed.length / queue.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[#f4991a]">
            {queue.length > 0 ? Math.round((processed.length / queue.length) * 100) : 0}%
          </span>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Current order ── */}
        <div className="lg:col-span-2 space-y-4">
          {done || !order ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h2 className="font-bold text-[#1a1c3a] text-lg mb-1">All calls done!</h2>
              <p className="text-sm text-gray-400">Great work. {processed.length} orders processed today.</p>
            </div>
          ) : (
            <>
              {/* Order card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-[#1a1c3a] px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Now Calling</p>
                    <p className="text-white font-bold text-lg font-mono">{order.trackingNumber}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <span className="text-white/30 text-xs">{pending.length} left</span>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Customer info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center font-bold text-[#1a1c3a] flex-shrink-0">
                          {order.customerName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-[#1a1c3a] text-sm">{order.customerName}</p>
                          <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1 text-xs text-[#f4991a] font-semibold hover:underline">
                            <Phone size={11} /> {order.customerPhone}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                        {order.customerAddress}, {order.customerCity}
                      </div>
                      {order.callAttempts > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-orange-500">
                          <AlertCircle size={11} />
                          {order.callAttempts} previous attempt{order.callAttempts > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Package size={12} /> Order
                      </p>
                      {order.products.map((p, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-gray-600 truncate flex-1 mr-2">{p.name} ×{p.quantity}</span>
                          <span className="font-semibold text-[#1a1c3a] flex-shrink-0">KES {(p.price * p.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-gray-100 flex justify-between text-xs font-bold">
                        <span className="text-gray-600">Total</span>
                        <span className="text-[#f4991a]">KES {order.totalAmount.toLocaleString()}</span>
                      </div>
                      {order.notes && (
                        <div className="flex items-start gap-1 text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mt-2">
                          <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
                          {order.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Call note */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                      <MessageSquare size={12} /> Call Note (optional)
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
                      <p className="text-xs font-semibold text-blue-700">New delivery date</p>
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
                    <button onClick={() => submit('confirmed')} className="flex flex-col items-center gap-1.5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all">
                      <CheckCircle size={18} />
                      Confirmed
                    </button>
                    <button onClick={() => submit('not_reached')} className="flex flex-col items-center gap-1.5 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-bold text-xs transition-all">
                      <PhoneOff size={18} />
                      Not Reached
                    </button>
                    <button
                      onClick={() => { setShowReschedule(v => !v); if (showReschedule && rescheduleDate) submit('rescheduled') }}
                      className="flex flex-col items-center gap-1.5 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 rounded-xl font-bold text-xs transition-all"
                    >
                      <Calendar size={18} />
                      Reschedule
                    </button>
                    <button onClick={() => submit('cancelled')} className="flex flex-col items-center gap-1.5 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 rounded-xl font-bold text-xs transition-all">
                      <XCircle size={18} />
                      Cancel
                    </button>
                  </div>

                  {showReschedule && rescheduleDate && (
                    <button onClick={() => submit('rescheduled')} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all">
                      Confirm Reschedule
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="space-y-4">
          {/* Call script */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-[#1a1c3a] text-sm mb-4 flex items-center gap-2">
              <MessageSquare size={14} className="text-[#f4991a]" />
              Call Script
            </h3>
            <ol className="space-y-2.5">
              {script.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#f4991a]/10 text-[#f4991a] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-xs text-gray-600 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Processed */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-[#1a1c3a] text-sm mb-3">Done ({processed.length})</h3>
            {processed.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No calls yet</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {processed.map(o => {
                  const entry = calls[o.id]!
                  const cfg = resultConfig[entry.result!]
                  const Icon = cfg.icon
                  return (
                    <div key={o.id} className={cn('flex items-center gap-2.5 p-2.5 rounded-xl border', cfg.bg, cfg.border)}>
                      <Icon size={14} className={cn('flex-shrink-0', cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#1a1c3a] font-mono">{o.trackingNumber}</p>
                        <p className={cn('text-[10px] font-semibold', cfg.color)}>{cfg.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-[#1a1c3a] text-sm mb-3">Up Next ({Math.max(0, pending.length - 1)})</h3>
            <div className="space-y-2">
              {pending.slice(1, 5).map((o, i) => (
                <div key={o.id} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-[#1a1c3a]/10 text-[#1a1c3a] text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 2}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1a1c3a] truncate">{o.customerName}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{o.trackingNumber}</p>
                  </div>
                </div>
              ))}
              {pending.length > 5 && <p className="text-xs text-gray-400 text-center">+{pending.length - 5} more</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
