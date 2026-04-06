'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { Agent, AgentStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Headphones, Plus, Search, X, Eye, EyeOff, Copy, Check,
  CheckCircle, XCircle, Clock, TrendingUp, Phone, Mail,
  RefreshCw, ShieldOff, ShieldCheck, Trash2, Users
} from 'lucide-react'

const statusConfig: Record<AgentStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  active:    { label: 'Active',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  inactive:  { label: 'Inactive',  color: 'text-gray-500',    bg: 'bg-gray-100',   border: 'border-gray-200',    dot: 'bg-gray-400'    },
  suspended: { label: 'Suspended', color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-500'     },
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const s = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border', s.color, s.bg, s.border)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
      {s.label}
    </span>
  )
}

function RateBadge({ rate }: { rate: number }) {
  const color = rate >= 70 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : rate >= 50 ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
              :              'text-red-600 bg-red-50 border-red-200'
  return (
    <span className={cn('inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-lg border', color)}>
      {rate.toFixed(1)}%
    </span>
  )
}

const statusFilters: { value: AgentStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'active',    label: 'Active'    },
  { value: 'inactive',  label: 'Inactive'  },
  { value: 'suspended', label: 'Suspended' },
]

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'all'>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [savedAgent, setSavedAgent] = useState<Agent | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: genPassword(), notes: '' })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    setLoading(true)
    const { data } = await supabase.from('agents').select('*').order('created_at', { ascending: false })
    if (data) {
      setAgents(data.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || '',
        password: row.password || '',
        status: row.status as AgentStatus,
        totalCalls: 0,
        confirmed: 0,
        notReached: 0,
        rescheduled: 0,
        notes: row.notes || undefined,
        createdAt: row.created_at,
      })))
    }
    setLoading(false)
  }

  const filtered = agents.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.phone.includes(q)
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total:  agents.length,
    active: agents.filter(a => a.status === 'active').length,
    totalCalls: agents.reduce((s, a) => s + a.totalCalls, 0),
    avgRate: 0,
  }

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) return
    setSaving(true)
    const { data, error } = await supabase.from('agents').insert({
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      password: form.password,
      status: 'active',
      notes: form.notes || null,
    }).select().single()

    if (error) {
      alert('Error: ' + error.message)
      setSaving(false)
      return
    }

    if (data && !error) {
      const newAgent: Agent = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        password: form.password,
        status: 'active',
        totalCalls: 0,
        confirmed: 0,
        notReached: 0,
        rescheduled: 0,
        notes: data.notes || undefined,
        createdAt: data.created_at,
      }
      setAgents(prev => [newAgent, ...prev])
      setSavedAgent(newAgent)
      setDrawerOpen(false)
      setForm({ name: '', email: '', phone: '', password: genPassword(), notes: '' })
    }
    setSaving(false)
  }

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(key)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const toggleStatus = async (id: string, current: AgentStatus) => {
    const next: AgentStatus = current === 'active' ? 'inactive' : 'active'
    await supabase.from('agents').update({ status: next }).eq('id', id)
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: next } : a))
  }

  const removeAgent = async (id: string) => {
    await supabase.from('agents').delete().eq('id', id)
    setAgents(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="min-h-screen">
      <Header title="Agents" subtitle={`${stats.total} call agents`} />

      <div className="px-6 pt-5 pb-10 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Agents',     value: stats.total,      icon: Users,       color: 'text-[#1a1c3a]',   bg: 'bg-white'      },
            { label: 'Active',           value: stats.active,     icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Calls',      value: stats.totalCalls, icon: Phone,       color: 'text-blue-600',    bg: 'bg-blue-50'    },
            { label: 'Avg Confirm. Rate',value: `${stats.avgRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-[#f4991a]', bg: 'bg-orange-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3`}>
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1a1c3a]">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filter + add */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {statusFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === f.value ? 'bg-[#1a1c3a] text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex-shrink-0"
          >
            <Plus size={13} />
            Add Agent
          </button>
        </div>

        {/* Credentials banner */}
        {savedAgent && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-emerald-700">Agent account created — share credentials</p>
              </div>
              <button onClick={() => setSavedAgent(null)} className="text-emerald-400 hover:text-emerald-600"><X size={15} /></button>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: 'Email',     value: savedAgent.email,    key: 'email' },
                { label: 'Password',  value: savedAgent.password, key: 'pass'  },
                { label: 'Login URL', value: 'shipedo.com/login', key: 'url'   },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-emerald-100">
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">{item.label}</p>
                    <p className="text-xs font-mono font-bold text-[#1a1c3a]">{item.value}</p>
                  </div>
                  <button onClick={() => copyText(item.value, item.key)} className="text-gray-300 hover:text-emerald-600 transition-colors ml-2">
                    {copiedField === item.key ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agents table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  {['Agent', 'Contact', 'Total Calls', 'Confirmed', 'Rate', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className={cn(
                      'text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5 first:px-6',
                      ['Joined'].includes(h) && 'hidden xl:table-cell',
                      h === 'Contact' && 'hidden md:table-cell',
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400">
                      <div className="w-6 h-6 border-2 border-gray-200 border-t-[#f4991a] rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm">Loading agents...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400">
                      <Headphones size={36} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No agents found</p>
                    </td>
                  </tr>
                ) : filtered.map(agent => {
                  const rate = agent.totalCalls > 0 ? (agent.confirmed / agent.totalCalls) * 100 : 0
                  return (
                    <tr key={agent.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
                            {agent.name[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#1a1c3a]">{agent.name}</p>
                            {agent.notes && <p className="text-xs text-gray-400 truncate max-w-[140px]">{agent.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="space-y-1">
                          <a href={`mailto:${agent.email}`} className="flex items-center gap-1 text-xs text-gray-600 hover:text-[#f4991a] transition-colors">
                            <Mail size={11} className="text-gray-400" /> {agent.email}
                          </a>
                          <a href={`tel:${agent.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#f4991a] transition-colors">
                            <Phone size={11} className="text-gray-400" /> {agent.phone}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-[#1a1c3a]">{agent.totalCalls}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-bold text-emerald-600">{agent.confirmed}</span>
                      </td>
                      <td className="px-4 py-4">
                        <RateBadge rate={rate} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={agent.status} />
                      </td>
                      <td className="px-4 py-4 hidden xl:table-cell">
                        <span className="text-xs text-gray-400">{formatDate(agent.createdAt)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleStatus(agent.id, agent.status)}
                            title={agent.status === 'active' ? 'Deactivate' : 'Activate'}
                            className={cn(
                              'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                              agent.status === 'active'
                                ? 'bg-red-50 text-red-400 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'
                            )}
                          >
                            {agent.status === 'active' ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                          </button>
                          <button
                            onClick={() => removeAgent(agent.id)}
                            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Agent Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-[#1a1c3a]">Add New Agent</h2>
                <p className="text-xs text-gray-400 mt-0.5">Create a call agent account</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
                <X size={15} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Agent's full name"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email (login) *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="agent@shipedo.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+212600000000"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, password: genPassword() }))}
                    className="w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-100 transition-all flex-shrink-0"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Working hours, specialization..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all resize-none"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-600 leading-relaxed">
                The agent will be <strong>Active</strong> immediately and can log in using their email and password above.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleSave}
                disabled={!form.name || !form.email || !form.password || saving}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1a1c3a] hover:bg-[#252750] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl transition-all"
              >
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Plus size={15} /> Create Agent</>
                }
              </button>
              <button onClick={() => setDrawerOpen(false)} className="px-5 py-3 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
