'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { fmtUsd, fmtKes, toKes } from '@/lib/currency'
import { cn } from '@/lib/utils'
import {
  Wallet, CheckCircle, XCircle, Clock, ArrowDownToLine, Search, AlertCircle,
} from 'lucide-react'

interface WR {
  id: string
  seller_id: string
  seller_name: string | null
  amount_usd: number
  method: string
  account_details: string
  status: 'pending' | 'validated' | 'rejected'
  requested_at: string
  processed_at: string | null
  note: string | null
}

export default function AdminWithdrawalsPage() {
  const [requests, setRequests] = useState<WR[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'validated' | 'rejected' | 'all'>('pending')
  const [busy, setBusy] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('withdraw_requests')
      .select('id, seller_id, seller_name, amount_usd, method, account_details, status, requested_at, processed_at, note')
      .order('requested_at', { ascending: false })
      .limit(200)
    setRequests((data ?? []) as WR[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const act = async (id: string, action: 'validate' | 'reject') => {
    if (action === 'reject' && !confirm('Reject this withdraw request?')) return
    setBusy(id)
    const res = await fetch(`/api/admin/withdrawals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const json = await res.json()
    setBusy(null)
    if (!json.ok) { alert(json.error || 'failed'); return }
    await load()
  }

  const filtered = requests.filter(r => {
    const matchStatus = filter === 'all' || r.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q || (r.seller_name || '').toLowerCase().includes(q) || r.account_details.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const totals = {
    pending: requests.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount_usd), 0),
    validated: requests.filter(r => r.status === 'validated').reduce((s, r) => s + Number(r.amount_usd), 0),
    pendingCount: requests.filter(r => r.status === 'pending').length,
  }

  return (
    <div className="min-h-screen">
      <Header title="Withdrawals" subtitle="Validate seller withdraw requests · all amounts in USD" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Clock size={18} className="text-[#f4991a]" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase">Pending</div>
                <div className="text-2xl font-bold text-[#1a1c3a]">{totals.pendingCount}</div>
                <div className="text-xs text-gray-500">{fmtUsd(totals.pending)} · {fmtKes(toKes(totals.pending))}</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle size={18} className="text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase">Validated total</div>
                <div className="text-2xl font-bold text-[#1a1c3a]">{fmtUsd(totals.validated)}</div>
                <div className="text-xs text-gray-500">{fmtKes(toKes(totals.validated))}</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <ArrowDownToLine size={18} className="text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase">Total requests</div>
                <div className="text-2xl font-bold text-[#1a1c3a]">{requests.length}</div>
                <div className="text-xs text-gray-500">All time</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search seller or account…"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20"
              />
            </div>
            <div className="flex gap-1.5">
              {(['pending', 'validated', 'rejected', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold capitalize',
                    filter === f ? 'bg-[#1a1c3a] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  {['Seller', 'Amount', 'Method', 'Account', 'Status', 'Requested', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 first:pl-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                    <Wallet size={32} className="mx-auto mb-2 opacity-30" />
                    No withdraw requests
                  </td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/40">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-[#1a1c3a]">{r.seller_name || '—'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-bold text-[#f4991a]">{fmtUsd(Number(r.amount_usd))}</div>
                      <div className="text-[10px] text-gray-400">{fmtKes(toKes(Number(r.amount_usd)))}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-block px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">{r.method}</span>
                    </td>
                    <td className="px-4 py-4 text-xs font-mono text-gray-600 max-w-[200px] truncate">{r.account_details}</td>
                    <td className="px-4 py-4">
                      {r.status === 'pending' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-100"><Clock size={10} /> Pending</span>}
                      {r.status === 'validated' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100"><CheckCircle size={10} /> Validated</span>}
                      {r.status === 'rejected' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100"><XCircle size={10} /> Rejected</span>}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400">{new Date(r.requested_at).toLocaleString()}</td>
                    <td className="px-4 py-4">
                      {r.status === 'pending' ? (
                        <div className="flex gap-1.5">
                          <button
                            disabled={busy === r.id}
                            onClick={() => act(r.id, 'validate')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold disabled:opacity-50"
                          >
                            <CheckCircle size={11} className="inline mr-1" /> Validate
                          </button>
                          <button
                            disabled={busy === r.id}
                            onClick={() => act(r.id, 'reject')}
                            className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold border border-red-200 disabled:opacity-50"
                          >
                            <XCircle size={11} className="inline mr-1" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400">{r.processed_at ? new Date(r.processed_at).toLocaleDateString() : '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
