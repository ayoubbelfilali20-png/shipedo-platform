'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Mail, Phone, Headphones, CheckCircle, Clock, XCircle } from 'lucide-react'

interface AgentRow {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  notes: string | null
  created_at: string
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [agent, setAgent] = useState<AgentRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, cancelled: 0 })

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      const { data: a } = await supabase.from('agents').select('*').eq('id', id).single()
      if (a) setAgent(a as AgentRow)
      const { data: orders } = await supabase.from('orders').select('status').eq('agent_id', id)
      if (orders) {
        const total = orders.length
        const confirmed = orders.filter((o: any) => o.status === 'confirmed' || o.status === 'delivered').length
        const pending = orders.filter((o: any) => o.status === 'pending' || o.status === 'new').length
        const cancelled = orders.filter((o: any) => o.status === 'cancelled' || o.status === 'rejected').length
        setStats({ total, confirmed, pending, cancelled })
      }
      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Agent" />
        <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen">
        <Header title="Agent not found" />
        <div className="p-10 text-center text-gray-400 text-sm">This agent does not exist.</div>
      </div>
    )
  }

  const rate = stats.total > 0 ? (stats.confirmed / stats.total) * 100 : 0

  return (
    <div className="min-h-screen">
      <Header title={agent.name} subtitle="Call agent profile · read-only view" />

      <div className="p-6 space-y-6 max-w-5xl">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#1a1c3a]">
          <ArrowLeft size={14} /> Back to agents
        </button>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-2xl font-bold text-blue-700">
            {agent.name[0]}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#1a1c3a]">{agent.name}</h2>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Mail size={11} /> {agent.email}</span>
              {agent.phone && <span className="flex items-center gap-1"><Phone size={11} /> {agent.phone}</span>}
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-600 capitalize">{agent.status}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <Headphones size={18} className="text-[#1a1c3a] mb-3" />
            <div className="text-3xl font-bold text-[#1a1c3a]">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-1">Assigned orders</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <CheckCircle size={18} className="text-emerald-600 mb-3" />
            <div className="text-3xl font-bold text-[#1a1c3a]">{stats.confirmed}</div>
            <div className="text-xs text-gray-500 mt-1">Confirmed</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <Clock size={18} className="text-yellow-600 mb-3" />
            <div className="text-3xl font-bold text-[#1a1c3a]">{stats.pending}</div>
            <div className="text-xs text-gray-500 mt-1">Pending</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <XCircle size={18} className="text-red-500 mb-3" />
            <div className="text-3xl font-bold text-[#1a1c3a]">{rate.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 mt-1">Confirm rate</div>
          </div>
        </div>

        {agent.notes && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h3 className="font-bold text-[#1a1c3a] mb-2">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{agent.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
