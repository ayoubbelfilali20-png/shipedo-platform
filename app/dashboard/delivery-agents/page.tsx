'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { UserPlus, Search, Truck, X, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

type DeliveryAgent = {
  id: string
  name: string
  email: string
  phone?: string
  status: string
  password: string
  notes?: string
  created_at: string
}

function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}

export default function DeliveryAgentsPage() {
  const [agents, setAgents] = useState<DeliveryAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPassFor, setShowPassFor] = useState<string | null>(null)

  // Form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState(() => generatePassword())
  const [notes, setNotes] = useState('')
  const [created, setCreated] = useState<DeliveryAgent | null>(null)

  useEffect(() => {
    supabase.from('delivery_agents').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setAgents((data || []) as DeliveryAgent[]); setLoading(false) })
  }, [])

  const filtered = agents.filter(a => {
    const q = search.toLowerCase()
    return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
  })

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('delivery_agents').insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      password,
      notes: notes.trim() || null,
    }).select().single()
    if (data) {
      setAgents(prev => [data as DeliveryAgent, ...prev])
      setCreated(data as DeliveryAgent)
      setName(''); setEmail(''); setPhone(''); setNotes(''); setPassword(generatePassword())
      setShowAdd(false)
    }
    setSaving(false)
  }

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'active' ? 'inactive' : 'active'
    await supabase.from('delivery_agents').update({ status: next }).eq('id', id)
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: next } : a))
  }

  return (
    <div className="p-6 space-y-4">
      <Header title="Delivery Agents" subtitle={`${agents.length} delivery agent(s)`} />

      {created && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle size={18} className="text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-800">Delivery agent created</p>
            <p className="text-xs text-emerald-600 mt-1">
              <strong>{created.name}</strong> — {created.email} — Password: <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono">{created.password}</code>
            </p>
          </div>
          <button onClick={() => setCreated(null)} className="text-emerald-400 hover:text-emerald-600"><X size={14} /></button>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1a1c3a] hover:bg-[#2a2c4a] text-white text-xs font-bold rounded-xl">
          <UserPlus size={14} /> Add Delivery Agent
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-[#1a1c3a] text-sm">New Delivery Agent</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email *</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Password</label>
              <div className="flex gap-2">
                <input value={password} onChange={e => setPassword(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-400" />
                <button onClick={() => setPassword(generatePassword())}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-bold rounded-lg">Generate</button>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !name.trim() || !email.trim()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg">
              {saving ? 'Creating...' : 'Create Agent'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Agent list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Truck size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No delivery agents yet</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-gray-400 uppercase font-bold">Name</th>
                <th className="text-left px-4 py-3 text-gray-400 uppercase font-bold">Email</th>
                <th className="text-left px-4 py-3 text-gray-400 uppercase font-bold">Phone</th>
                <th className="text-left px-4 py-3 text-gray-400 uppercase font-bold">Password</th>
                <th className="text-left px-4 py-3 text-gray-400 uppercase font-bold">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 uppercase font-bold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-bold text-[#1a1c3a]">{a.name}</td>
                  <td className="px-4 py-3 text-gray-500">{a.email}</td>
                  <td className="px-4 py-3 text-gray-500">{a.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setShowPassFor(showPassFor === a.id ? null : a.id)}
                      className="flex items-center gap-1 text-gray-400 hover:text-gray-600">
                      {showPassFor === a.id ? (
                        <><EyeOff size={11} /><code className="font-mono">{a.password}</code></>
                      ) : (
                        <><Eye size={11} /><span>••••••</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(a.id, a.status)}
                      className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border',
                        a.status === 'active'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                      )}>
                      {a.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
