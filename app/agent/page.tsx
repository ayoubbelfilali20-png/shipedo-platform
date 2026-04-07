'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Phone, CheckCircle, XCircle, Clock, Package, Truck,
  ArrowRight, TrendingUp, AlertCircle, User, MapPin
} from 'lucide-react'

type OrderRow = {
  id: string
  tracking_number: string
  customer_name: string
  customer_phone: string
  customer_city: string
  items: any[]
  total_amount: number
  status: string
  notes?: string | null
  call_attempts?: number | null
  reminded_at?: string | null
  last_call_at?: string | null
  last_call_agent_id?: string | null
  created_at: string
}

export default function AgentDashboard() {
  const router = useRouter()
  const [agentId, setAgentId] = useState<string | null>(null)
  const [pending, setPending] = useState<OrderRow[]>([])
  const [mine, setMine] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let aid: string | null = null
    try {
      const u = localStorage.getItem('shipedo_user')
      if (u) {
        const parsed = JSON.parse(u)
        if (parsed.role === 'agent') aid = parsed.id
      }
    } catch {}
    setAgentId(aid)

    const run = async () => {
      const nowIso = new Date().toISOString()
      const { data: pen } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .or(`reminded_at.is.null,reminded_at.lte.${nowIso}`)
        .order('created_at', { ascending: true })
      setPending((pen || []) as OrderRow[])

      let mineData: OrderRow[] = []
      if (aid) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('last_call_agent_id', aid)
          .order('last_call_at', { ascending: false })
        mineData = (data || []) as OrderRow[]
        if (mineData.length === 0) {
          const r = await supabase
            .from('orders')
            .select('*')
            .gt('call_attempts', 0)
            .order('last_call_at', { ascending: false })
          mineData = (r.data || []) as OrderRow[]
        }
      }
      setMine(mineData)
      setLoading(false)
    }
    run()
  }, [])

  const stats = useMemo(() => ({
    toCall:    pending.length,
    confirmed: mine.filter(o => o.status === 'confirmed').length,
    prepared:  mine.filter(o => o.status === 'prepared').length,
    delivered: mine.filter(o => o.status === 'delivered').length,
    done:      mine.filter(o => ['confirmed','prepared','delivered','shipped'].includes(o.status)).length,
  }), [pending, mine])

  const totalToday = stats.toCall + stats.done
  const progress = totalToday > 0 ? Math.round((stats.done / totalToday) * 100) : 0

  return (
    <div className="min-h-screen">
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
              <p className="text-white font-bold text-lg">{stats.toCall} orders to call</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs mb-1">Progress</p>
              <p className="text-[#f4991a] font-bold text-2xl">{progress}%</p>
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#f4991a] to-orange-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-white/30 text-xs mt-2">{stats.done} done out of {totalToday} total</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'To Call',    value: stats.toCall,    icon: Phone,       color: 'text-[#1a1c3a]',   bg: 'bg-white'      },
            { label: 'Confirmed',  value: stats.confirmed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Prepared',   value: stats.prepared,  icon: Package,     color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
            { label: 'Delivered',  value: stats.delivered, icon: Truck,       color: 'text-sky-600',     bg: 'bg-sky-50'     },
            { label: 'Total Done', value: stats.done,      icon: TrendingUp,  color: 'text-[#f4991a]',   bg: 'bg-orange-50'  },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3`}>
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
              {stats.toCall > 0 && (
                <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{stats.toCall}</span>
              )}
            </div>
            <Link href="/agent/calls" className="text-[#f4991a] text-xs font-semibold hover:underline flex items-center gap-1">
              Open queue <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
          ) : pending.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-gray-400">
              <CheckCircle size={36} className="mb-3 text-emerald-300" />
              <p className="text-sm font-medium text-emerald-500">All calls done!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {pending.slice(0, 4).map((order, i) => (
                <div key={order.id} onClick={() => router.push('/agent/calls')} className="px-6 py-4 hover:bg-gray-50/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#1a1c3a] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-[#1a1c3a]">{order.tracking_number}</span>
                        {(order.call_attempts || 0) > 0 && (
                          <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded font-semibold">
                            {order.call_attempts} attempt{(order.call_attempts || 0) > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500"><User size={11} />{order.customer_name}</span>
                        <span className="flex items-center gap-1 text-xs text-[#f4991a] font-semibold">{order.customer_phone}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin size={11} />{order.customer_city}</span>
                      </div>
                      {order.notes && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600">
                          <AlertCircle size={10} /><span className="truncate">{order.notes}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#f4991a]">KES {(order.total_amount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
              {pending.length > 4 && (
                <div className="px-6 py-3 text-center">
                  <Link href="/agent/calls" className="text-xs text-[#f4991a] font-semibold hover:underline">
                    +{pending.length - 4} more orders in queue →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* My recent activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-bold text-[#1a1c3a] text-sm">My Recent Orders</h3>
            <Link href="/agent/history" className="text-[#f4991a] text-xs font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {mine.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">No orders handled yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {mine.slice(0, 5).map(o => (
                <div key={o.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-bold text-[#1a1c3a]">{o.tracking_number}</p>
                    <p className="text-xs text-gray-500 truncate">{o.customer_name} · {o.customer_city}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-gray-500">{o.status}</span>
                    <p className="text-xs font-bold text-[#f4991a]">KES {(o.total_amount || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
