'use client'

import { useEffect, useMemo, useState } from 'react'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { fmtUsd, fmtKes, toKes } from '@/lib/currency'
import { cn } from '@/lib/utils'
import {
  FileText, Wallet, Package, Search, Eye, X, Calendar, Sparkles, Download,
} from 'lucide-react'

interface InvoiceRow {
  id: string
  invoice_number: string
  seller_id: string
  seller_name: string | null
  period_start: string
  period_end: string
  delivered_count: number
  orders: any[]
  total_sales_usd: number
  confirmation_fees_usd: number
  upsell_fees_usd: number
  cross_sell_fees_usd: number
  shipping_fees_usd: number
  total_fees_usd: number
  net_usd: number
  status: string
  created_at: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtPeriod(start: string, end: string) {
  const e = new Date(end); e.setUTCDate(e.getUTCDate() - 1)
  return `${fmtDate(start)} – ${fmtDate(e.toISOString())}`
}

export default function SellerInvoicesPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<InvoiceRow | null>(null)

  useEffect(() => {
    let sellerId: string | null = null
    try {
      const u = localStorage.getItem('shipedo_seller')
      if (u) {
        const parsed = JSON.parse(u)
        if (parsed.role === 'seller') sellerId = String(parsed.id)
      }
    } catch {}
    if (!sellerId) { setLoading(false); return }

    supabase.from('seller_invoices').select('id, seller_id, period_start, period_end, delivered_count, total_sales_usd, total_fees_usd, net_usd, status, created_at').eq('seller_id', sellerId).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setRows((data ?? []) as InvoiceRow[]); setLoading(false) })
  }, [])

  const totals = useMemo(() => ({
    count: rows.length,
    paid: rows.reduce((s, r) => s + Number(r.net_usd || 0), 0),
    orders: rows.reduce((s, r) => s + Number(r.delivered_count || 0), 0),
  }), [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      r.invoice_number.toLowerCase().includes(q) || fmtPeriod(r.period_start, r.period_end).toLowerCase().includes(q),
    )
  }, [rows, search])

  return (
    <div className="min-h-screen">
      <Header title="Invoices" subtitle="Your weekly statements · USD" role="seller" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <FileText size={18} className="text-[#1a1c3a] mb-3" />
            <div className="text-3xl font-bold text-[#1a1c3a]">{totals.count}</div>
            <div className="text-xs text-gray-500 mt-1">Invoices</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <Package size={18} className="text-blue-600 mb-3" />
            <div className="text-3xl font-bold text-[#1a1c3a]">{totals.orders}</div>
            <div className="text-xs text-gray-500 mt-1">Delivered orders</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <Wallet size={18} className="text-emerald-600 mb-3" />
            <div className="text-xl font-bold text-[#1a1c3a]">{fmtUsd(totals.paid)}</div>
            <div className="text-[11px] text-gray-400">{fmtKes(toKes(totals.paid))}</div>
            <div className="text-xs text-gray-500 mt-1">Total credited</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <Calendar size={18} className="text-[#f4991a] mb-3" />
            <div className="text-xl font-bold text-[#1a1c3a]">{rows[0] ? fmtDate(rows[0].created_at) : '—'}</div>
            <div className="text-xs text-gray-500 mt-1">Last invoice</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1a1c3a]">All invoices</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="w-56 pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  {['Invoice', 'Period', 'Orders', 'Sales', 'Fees', 'Net', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase px-4 py-3 first:pl-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                    <div className="text-sm">No invoices yet</div>
                  </td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/40 cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-mono font-bold text-[#1a1c3a]">#{r.invoice_number}</div>
                      <div className="text-[10px] text-gray-400">{fmtDate(r.created_at)}</div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">{fmtPeriod(r.period_start, r.period_end)}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold">
                        <Package size={10} /> {r.delivered_count}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-bold text-[#1a1c3a]">{fmtUsd(Number(r.total_sales_usd))}</div>
                      <div className="text-[10px] text-gray-400">{fmtKes(toKes(Number(r.total_sales_usd)))}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-gray-500">−{fmtUsd(Number(r.total_fees_usd))}</div>
                      <div className="text-[10px] text-gray-300">−{fmtKes(toKes(Number(r.total_fees_usd)))}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-base font-bold text-[#f4991a]">{fmtUsd(Number(r.net_usd))}</div>
                      <div className="text-[10px] text-gray-400">{fmtKes(toKes(Number(r.net_usd)))}</div>
                    </td>
                    <td className="px-4 py-4">
                      <button className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-orange-50 flex items-center justify-center text-gray-400 hover:text-[#f4991a]">
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

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="bg-[#1a1c3a] px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Invoice</p>
                <p className="text-white font-mono font-bold text-lg">#{selected.invoice_number}</p>
                <p className="text-white/50 text-xs mt-1">{fmtPeriod(selected.period_start, selected.period_end)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Net hero */}
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 text-center">
                <div className="text-[10px] text-orange-700 font-bold uppercase tracking-wider">Credited to wallet</div>
                <div className="text-4xl font-extrabold text-[#1a1c3a] mt-1">{fmtUsd(Number(selected.net_usd))}</div>
                <div className="text-sm text-gray-500 mt-1">{fmtKes(toKes(Number(selected.net_usd)))}</div>
              </div>

              {/* Breakdown */}
              <div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Breakdown</div>
                <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                  {[
                    { label: 'Total sales', value: Number(selected.total_sales_usd), credit: true },
                    { label: 'Confirmation fees', value: Number(selected.confirmation_fees_usd), credit: false },
                    { label: 'Shipping fees', value: Number(selected.shipping_fees_usd), credit: false },
                    { label: 'Upsell fees', value: Number(selected.upsell_fees_usd), credit: false },
                    { label: 'Cross-sell fees', value: Number(selected.cross_sell_fees_usd), credit: false },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-center px-4 py-3">
                      <span className="text-xs text-gray-600">{r.label}</span>
                      <div className="text-right">
                        <div className={cn('text-sm font-bold', r.credit ? 'text-[#1a1c3a]' : 'text-red-500')}>
                          {r.credit ? '' : '−'}{fmtUsd(r.value)}
                        </div>
                        <div className="text-[10px] text-gray-400">{r.credit ? '' : '−'}{fmtKes(toKes(r.value))}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Orders */}
              <div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Delivered orders ({selected.delivered_count})
                </div>
                <div className="bg-white border border-gray-100 rounded-xl max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {(selected.orders || []).map((o: any, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <div className="font-mono text-gray-500">{o.tracking || o.id?.slice(0, 8)}</div>
                      <div className="text-gray-600 truncate flex-1 mx-3">{o.customer || ''}</div>
                      <div className="text-right">
                        <div className="font-bold text-[#1a1c3a]">{fmtKes(Number(o.total_kes || 0))}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
