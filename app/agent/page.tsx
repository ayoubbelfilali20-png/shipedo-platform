'use client'

import Link from 'next/link'
import { mockOrders } from '@/lib/data'
import StatusBadge from '@/components/dashboard/StatusBadge'
import { formatDate } from '@/lib/utils'
import {
  Phone, CheckCircle, XCircle, Clock, RotateCcw,
  ArrowRight, TrendingUp, AlertCircle, User, MapPin
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// Orders the agent needs to handle = pending + confirmed
const callQueue = mockOrders
  .filter(o => ['pending', 'confirmed'].includes(o.status))
  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

// Simulate some calls already done today
const callsDone    = mockOrders.filter(o => ['delivered', 'shipped'].includes(o.status)).length
const confirmed    = mockOrders.filter(o => o.status === 'confirmed').length
const notReached   = mockOrders.filter(o => o.status === 'pending' && o.callAttempts > 0).length
const totalToday   = callsDone + callQueue.length

export default function AgentDashboard() {
  const router = useRouter()
  const progress = totalToday > 0 ? Math.round((callsDone / totalToday) * 100) : 0

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-[#1a1c3a] text-lg">Call Center Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Call Agent · Today</p>
        </div>
        <Link
          href="/agent/calls"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1c3a] hover:bg-[#252750] text-white text-sm font-bold rounded-xl transition-all"
        >
          <Phone size={15} />
          Start Calling
        </Link>
      </div>

      <div className="px-6 pt-5 pb-10 space-y-5">

        {/* Mission bar */}
        <div className="bg-[#1a1c3a] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">Today's Mission</p>
              <p className="text-white font-bold text-lg">{callQueue.length} orders to call</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs mb-1">Progress</p>
              <p className="text-[#f4991a] font-bold text-2xl">{progress}%</p>
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#f4991a] to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white/30 text-xs mt-2">{callsDone} done out of {totalToday} total</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'To Call',     value: callQueue.length, icon: Phone,       color: 'text-[#1a1c3a]',   bg: 'bg-white',      border: 'border-gray-100'   },
            { label: 'Confirmed',   value: confirmed,         icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Not Reached', value: notReached,        icon: XCircle,     color: 'text-red-500',     bg: 'bg-red-50',     border: 'border-red-100'     },
            { label: 'Calls Done',  value: callsDone,         icon: TrendingUp,  color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100'    },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl border ${s.border} shadow-sm p-4 flex items-center gap-3`}>
              <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                <s.icon size={16} className={s.color} />
              </div>
              <div>
                <p className="text-xl font-bold text-[#1a1c3a]">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Call queue preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#1a1c3a] text-sm">Call Queue</h3>
              {callQueue.length > 0 && (
                <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{callQueue.length}</span>
              )}
            </div>
            <Link href="/agent/calls" className="text-[#f4991a] text-xs font-semibold hover:underline flex items-center gap-1">
              Open queue <ArrowRight size={12} />
            </Link>
          </div>

          {callQueue.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-gray-400">
              <CheckCircle size={36} className="mb-3 text-emerald-300" />
              <p className="text-sm font-medium text-emerald-500">All calls done!</p>
              <p className="text-xs text-gray-300 mt-1">Great work today</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {callQueue.slice(0, 4).map((order, i) => (
                <div
                  key={order.id}
                  onClick={() => router.push('/agent/calls')}
                  className="px-6 py-4 hover:bg-gray-50/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#1a1c3a] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-[#1a1c3a]">{order.trackingNumber}</span>
                        <StatusBadge status={order.status} />
                        {order.callAttempts > 0 && (
                          <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded font-semibold">
                            {order.callAttempts} attempt{order.callAttempts > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <User size={11} className="text-gray-400" />
                          {order.customerName}
                        </span>
                        <a
                          href={`tel:${order.customerPhone}`}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-[#f4991a] font-semibold hover:underline"
                        >
                          <Phone size={11} />
                          {order.customerPhone}
                        </a>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin size={11} />
                          {order.customerCity}
                        </span>
                      </div>
                      {order.notes && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600">
                          <AlertCircle size={10} />
                          <span className="truncate">{order.notes}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#f4991a]">KES {order.totalAmount.toLocaleString()}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{order.paymentMethod}</p>
                    </div>
                  </div>
                </div>
              ))}
              {callQueue.length > 4 && (
                <div className="px-6 py-3 text-center">
                  <Link href="/agent/calls" className="text-xs text-[#f4991a] font-semibold hover:underline">
                    +{callQueue.length - 4} more orders in queue →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Performance hints */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Avg Call Time',     value: '0m 0s',  icon: Clock,      color: 'text-blue-600',    bg: 'bg-blue-50'   },
            { label: 'Confirmation Rate', value: '0%',     icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50'},
            { label: 'Return Rate',       value: '0%',     icon: RotateCcw,  color: 'text-red-500',     bg: 'bg-red-50'    },
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

      </div>
    </div>
  )
}
