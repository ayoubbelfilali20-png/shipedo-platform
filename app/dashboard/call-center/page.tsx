'use client'

import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { mockOrders } from '@/lib/data'
import { Order } from '@/lib/types'
import {
  Phone, CheckCircle, XCircle, PhoneOff, ChevronRight,
  MapPin, Package, Clock, MessageSquare, User, Star
} from 'lucide-react'

type CallResult = 'confirmed' | 'not_reachable' | 'cancelled' | null

const callScript = [
  'Greet the customer: "Hello, this is [Agent Name] calling from Shipedo."',
  'Confirm identity: "Am I speaking with [Customer Name]?"',
  'State purpose: "I\'m calling about your order [Tracking #] for [Product Name]."',
  'Confirm delivery address: "Can you confirm your delivery address at [Address]?"',
  'Confirm availability: "When is the best time to deliver?"',
  'Confirm order: "So we have [Product] for KES [Amount] to be delivered to [Address]. Is that correct?"',
  'Close: "Great! Your order is confirmed. You\'ll receive it within [X] days. Thank you!"',
]

export default function CallCenterPage() {
  const pendingOrders = mockOrders.filter((o) => o.status === 'pending')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [callResult, setCallResult] = useState<CallResult>(null)
  const [notes, setNotes] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [completedCalls, setCompletedCalls] = useState<string[]>([])
  const [scriptStep, setScriptStep] = useState(0)

  const currentOrder = pendingOrders[currentIndex]

  const handleAction = (action: 'confirmed' | 'not_reachable' | 'cancelled') => {
    setCallResult(action)
    setCompletedCalls([...completedCalls, currentOrder?.id])
    if (action !== 'not_reachable') {
      setAttempts(0)
    } else {
      setAttempts(attempts + 1)
    }
  }

  const nextOrder = () => {
    setCallResult(null)
    setNotes('')
    setScriptStep(0)
    setCurrentIndex((prev) => Math.min(prev + 1, pendingOrders.length - 1))
  }

  if (!currentOrder) {
    return (
      <div className="min-h-screen">
        <Header title="Call Center" subtitle="Order confirmation dashboard" />
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
          <CheckCircle size={60} className="text-emerald-400 mb-4" />
          <h3 className="text-xl font-bold text-[#1a1c3a] mb-2">All Done!</h3>
          <p className="text-sm">No pending orders to confirm right now.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Call Center"
        subtitle={`${pendingOrders.length - completedCalls.length} orders remaining`}
      />

      <div className="p-6">
        {/* Progress bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#1a1c3a]">Today's Progress</span>
            <span className="text-sm text-gray-500">{completedCalls.length}/{pendingOrders.length} confirmed</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-[#f4991a] to-orange-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(completedCalls.length / Math.max(pendingOrders.length, 1)) * 100}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3">
            {[
              { label: 'Confirmed', value: completedCalls.length, color: 'text-emerald-600' },
              { label: 'Remaining', value: pendingOrders.length - completedCalls.length, color: 'text-orange-600' },
              { label: 'Not Reached', value: attempts, color: 'text-red-500' },
            ].map((s) => (
              <div key={s.label}>
                <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
                <span className="text-xs text-gray-400 ml-1">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Current Order Card */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#1a1c3a] to-[#252750] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white/60 text-xs mb-1">Current Order</div>
                    <div className="text-white font-mono font-bold text-lg">{currentOrder.trackingNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white/60 text-xs mb-1">COD Amount</div>
                    <div className="text-[#f4991a] font-bold text-xl">KES {currentOrder.totalAmount.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="p-5 grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wide">Customer Info</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <User size={15} className="text-[#f4991a] flex-shrink-0" />
                      <span className="text-sm font-semibold text-[#1a1c3a]">{currentOrder.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Phone size={15} className="text-[#f4991a] flex-shrink-0" />
                      <span className="text-sm text-gray-600 font-mono">{currentOrder.customerPhone}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <MapPin size={15} className="text-[#f4991a] flex-shrink-0" />
                      <span className="text-sm text-gray-600">{currentOrder.customerAddress}, {currentOrder.customerCity}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock size={15} className="text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400">Attempts today: {currentOrder.callAttempts}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wide">Order Items</div>
                  <div className="space-y-2">
                    {currentOrder.products.map((p, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <Package size={15} className="text-[#f4991a] flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-[#1a1c3a]">{p.name}</div>
                          <div className="text-xs text-gray-400">Qty {p.quantity} × KES {p.price.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Call result feedback */}
            {callResult && (
              <div className={`rounded-2xl p-5 border ${
                callResult === 'confirmed'
                  ? 'bg-emerald-50 border-emerald-200'
                  : callResult === 'not_reachable'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  {callResult === 'confirmed' && <CheckCircle size={20} className="text-emerald-600" />}
                  {callResult === 'not_reachable' && <PhoneOff size={20} className="text-yellow-600" />}
                  {callResult === 'cancelled' && <XCircle size={20} className="text-red-500" />}
                  <span className="font-semibold text-sm">
                    {callResult === 'confirmed' && 'Order Confirmed ✓'}
                    {callResult === 'not_reachable' && 'Customer Not Reachable'}
                    {callResult === 'cancelled' && 'Order Cancelled'}
                  </span>
                </div>
                <button
                  onClick={nextOrder}
                  className="flex items-center gap-2 bg-[#1a1c3a] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#252750] transition-all"
                >
                  Next Order <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Action buttons */}
            {!callResult && (
              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Call Action</div>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleAction('confirmed')}
                    className="flex flex-col items-center gap-2 p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl transition-all hover:scale-105 group"
                  >
                    <div className="w-12 h-12 bg-emerald-500 group-hover:bg-emerald-600 rounded-xl flex items-center justify-center transition-colors">
                      <CheckCircle size={24} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-emerald-700">Confirmed</span>
                    <span className="text-xs text-emerald-500">Customer agreed</span>
                  </button>

                  <button
                    onClick={() => handleAction('not_reachable')}
                    className="flex flex-col items-center gap-2 p-4 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-2xl transition-all hover:scale-105 group"
                  >
                    <div className="w-12 h-12 bg-yellow-500 group-hover:bg-yellow-600 rounded-xl flex items-center justify-center transition-colors">
                      <PhoneOff size={24} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-yellow-700">No Answer</span>
                    <span className="text-xs text-yellow-500">Try again later</span>
                  </button>

                  <button
                    onClick={() => handleAction('cancelled')}
                    className="flex flex-col items-center gap-2 p-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-2xl transition-all hover:scale-105 group"
                  >
                    <div className="w-12 h-12 bg-red-500 group-hover:bg-red-600 rounded-xl flex items-center justify-center transition-colors">
                      <XCircle size={24} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-red-700">Cancelled</span>
                    <span className="text-xs text-red-500">Customer refused</span>
                  </button>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-[#f4991a]" />
                <span className="text-sm font-semibold text-[#1a1c3a]">Call Notes</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this call (customer preferences, delivery instructions, etc.)"
                className="w-full h-24 resize-none bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
              />
            </div>
          </div>

          {/* Call Script */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-[#1a1c3a] mb-4 flex items-center gap-2">
                <Star size={16} className="text-[#f4991a]" />
                Call Script
              </h3>
              <div className="space-y-3">
                {callScript.map((step, i) => (
                  <button
                    key={i}
                    onClick={() => setScriptStep(i)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                      scriptStep === i
                        ? 'bg-[#f4991a]/10 border-[#f4991a]/30 text-[#1a1c3a]'
                        : i < scriptStep
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : 'bg-gray-50 border-gray-100 text-gray-500'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        scriptStep === i
                          ? 'bg-[#f4991a] text-white'
                          : i < scriptStep
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {i < scriptStep ? '✓' : i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setScriptStep(Math.min(scriptStep + 1, callScript.length - 1))}
                className="w-full mt-4 py-2.5 bg-[#1a1c3a] text-white text-sm font-semibold rounded-xl hover:bg-[#252750] transition-all"
              >
                Next Step →
              </button>
            </div>

            {/* Pending queue */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-[#1a1c3a] mb-3 text-sm">Queue ({pendingOrders.length})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pendingOrders.map((order, i) => (
                  <div
                    key={order.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl text-xs ${
                      i === currentIndex
                        ? 'bg-[#f4991a]/10 border border-[#f4991a]/20'
                        : completedCalls.includes(order.id)
                        ? 'bg-emerald-50 opacity-60'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      i === currentIndex ? 'bg-[#f4991a]' :
                      completedCalls.includes(order.id) ? 'bg-emerald-500' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#1a1c3a] truncate">{order.customerName}</div>
                      <div className="text-gray-400">{order.customerCity}</div>
                    </div>
                    <span className="font-bold text-[#1a1c3a]">{(order.totalAmount / 1000).toFixed(1)}K</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
