'use client'

import { useEffect, useMemo, useState } from 'react'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  FileText, Wallet, Package, CheckCircle, Mail, Search,
  Download, Eye, X, Calendar, AlertTriangle, Sparkles,
} from 'lucide-react'

interface PayoutRow {
  id:               string
  seller_id:        string
  seller_name:      string
  seller_email:     string
  period_start:     string
  period_end:       string
  delivered_count:  number
  gross_amount:     number
  delivery_fee:     number
  net_amount:       number
  currency:         string
  status:           'sent' | 'pending' | 'failed'
  email_message_id: string | null
  email_error:      string | null
  sent_at:          string
  created_at:       string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatPeriod(start: string, end: string) {
  const e = new Date(end)
  e.setUTCDate(e.getUTCDate() - 1)
  return `${formatDate(start)} – ${formatDate(e.toISOString())}`
}

function fmtMoney(currency: string, n: number) {
  return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function invoiceNumber(row: PayoutRow) {
  return `INV-${row.period_start.replace(/-/g, '')}-${row.seller_id.slice(0, 6).toUpperCase()}`
}

export default function SellerInvoicesPage() {
  const [rows, setRows]       = useState<PayoutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState<PayoutRow | null>(null)

  useEffect(() => {
    let sellerId: string | null = null
    try {
      const stored = localStorage.getItem('shipedo_seller')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.role === 'seller') sellerId = String(u.id)
      }
    } catch {}
    if (!sellerId) { setLoading(false); return }

    supabase
      .from('seller_payouts')
      .select('*')
      .eq('seller_id', sellerId)
      .order('period_end', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        setRows((data ?? []) as PayoutRow[])
        setLoading(false)
      })
  }, [])

  const totals = useMemo(() => {
    const sent = rows.filter(r => r.status === 'sent')
    return {
      count:        sent.length,
      total_paid:   sent.reduce((s, r) => s + Number(r.net_amount || 0), 0),
      total_orders: sent.reduce((s, r) => s + Number(r.delivered_count || 0), 0),
      currency:     sent[0]?.currency ?? 'MAD',
    }
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      invoiceNumber(r).toLowerCase().includes(q) ||
      formatPeriod(r.period_start, r.period_end).toLowerCase().includes(q)
    )
  }, [rows, search])

  return (
    <div className="min-h-screen">
      <Header title="Invoices & Payouts" subtitle="Your weekly statements from Shipedo" role="seller" />

      <div className="p-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total payouts',     value: totals.count.toString(),                              icon: FileText, color: 'text-[#1a1c3a]', bg: 'bg-white'      },
            { label: 'Delivered orders',  value: totals.total_orders.toString(),                       icon: Package,  color: 'text-blue-600',  bg: 'bg-blue-50'    },
            { label: 'Total credited',    value: fmtMoney(totals.currency, totals.total_paid),         icon: Wallet,   color: 'text-emerald-600', bg: 'bg-emerald-50', isMoney: true },
            { label: 'Last payout',       value: rows[0] ? formatDate(rows[0].sent_at) : '—',          icon: Calendar, color: 'text-[#f4991a]', bg: 'bg-orange-50'  },
          ].map(s => (
            <div key={s.label} className={cn('rounded-2xl border border-gray-100 p-5', s.bg)}>
              <div className={cn('w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center mb-3', s.color)}>
                <s.icon size={16} />
              </div>
              <div className={cn('font-bold text-[#1a1c3a]', s.isMoney ? 'text-xl' : 'text-3xl')}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Empty / loading / error states */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-700">Could not load your payouts</div>
              <div className="text-xs text-red-600 mt-0.5 font-mono">{error}</div>
            </div>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#1a1c3a]">All statements</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by invoice or period…"
                className="w-64 pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Invoice</th>
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Period</th>
                  <th className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Orders</th>
                  <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Gross</th>
                  <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Fees</th>
                  <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Net</th>
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Sent</th>
                  <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading && (
                  <tr><td colSpan={8} className="text-center py-16 text-sm text-gray-400">Loading…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-16">
                    <FileText size={36} className="mx-auto mb-2 text-gray-200" />
                    <div className="text-sm font-semibold text-gray-400">No payouts yet</div>
                    <div className="text-xs text-gray-300 mt-1">Your weekly statements will appear here once admin runs billing.</div>
                  </td></tr>
                )}
                {!loading && filtered.map(row => (
                  <tr key={row.id} className="table-row-hover">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FileText size={15} className="text-[#f4991a]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#1a1c3a] font-mono">{invoiceNumber(row)}</div>
                          <div className={cn(
                            'text-[10px] font-bold uppercase tracking-wider mt-0.5',
                            row.status === 'sent'   ? 'text-emerald-600' :
                            row.status === 'failed' ? 'text-red-500'     : 'text-yellow-600'
                          )}>
                            {row.status}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">{formatPeriod(row.period_start, row.period_end)}</td>
                    <td className="px-4 py-4 text-center hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                        {row.delivered_count}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-gray-500 hidden lg:table-cell">{fmtMoney(row.currency, row.gross_amount)}</td>
                    <td className="px-4 py-4 text-right text-xs text-gray-500 hidden lg:table-cell">−{fmtMoney(row.currency, row.delivery_fee)}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="text-sm font-bold text-[#f4991a]">{fmtMoney(row.currency, row.net_amount)}</div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell text-xs text-gray-400">{formatDate(row.sent_at)}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => setSelected(row)}
                        className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-orange-50 flex items-center justify-center text-gray-400 hover:text-[#f4991a] transition-all"
                        title="View statement"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && <StatementModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function StatementModal({ row, onClose }: { row: PayoutRow; onClose: () => void }) {
  const number = invoiceNumber(row)
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#f4991a]" />
            <span className="font-bold text-[#1a1c3a] text-sm font-mono">{number}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-200 hover:bg-gray-300 flex items-center justify-center">
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 bg-[#f4991a] rounded-xl flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-[#1a1c3a] text-xl">Shipedo</div>
                  <div className="text-xs text-gray-400">Weekly statement</div>
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div>Issued {formatDate(row.sent_at)}</div>
              <div className="mt-1">{formatPeriod(row.period_start, row.period_end)}</div>
            </div>
          </div>

          <div className="h-1 w-full rounded-full mb-6 bg-gradient-to-r from-[#1a1c3a] via-[#f4991a] to-[#1a1c3a]" />

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 mb-6">
            <div className="text-xs font-bold text-orange-700 uppercase tracking-wider">Net payout</div>
            <div className="text-4xl font-bold text-[#1a1c3a] mt-1">{fmtMoney(row.currency, row.net_amount)}</div>
            <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-orange-200/60">
              <div>
                <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Delivered</div>
                <div className="text-lg font-bold text-[#1a1c3a] mt-1">{row.delivered_count}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Gross</div>
                <div className="text-lg font-bold text-[#1a1c3a] mt-1">{fmtMoney(row.currency, row.gross_amount)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Fees</div>
                <div className="text-lg font-bold text-[#1a1c3a] mt-1">−{fmtMoney(row.currency, row.delivery_fee)}</div>
              </div>
            </div>
          </div>

          {row.status === 'sent' && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
              <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
              <p className="text-xs text-emerald-700">
                Statement emailed to <strong>{row.seller_email}</strong> and credited to your wallet.
              </p>
            </div>
          )}
          {row.status === 'failed' && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-3">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-red-700 font-semibold">Email delivery failed</p>
                {row.email_error && <p className="text-[11px] text-red-600 font-mono mt-1">{row.email_error}</p>}
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">For any question contact <span className="text-[#f4991a]">billing@shipedo.com</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
