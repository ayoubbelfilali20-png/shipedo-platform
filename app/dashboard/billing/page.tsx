'use client'

import { useState, useEffect, useMemo } from 'react'
import Header from '@/components/dashboard/Header'
import { fmtUsd, fmtKes, toKes } from '@/lib/currency'
import { cn } from '@/lib/utils'
import {
  CalendarRange, Send, RefreshCw, CheckCircle, AlertTriangle,
  Wallet, Users, Package, FileText, Search, X, Sparkles,
} from 'lucide-react'

type Preset = 'this_week' | 'last_week' | 'custom'

interface PreviewRow {
  seller_id: string
  seller_name: string
  seller_email: string
  delivered_count: number
  total_sales_usd: number
  confirmation_fees_usd: number
  upsell_fees_usd: number
  cross_sell_fees_usd: number
  shipping_fees_usd: number
  total_fees_usd: number
  net_usd: number
  order_count: number
}

interface PreviewResponse {
  success: boolean
  period: { start: string; end: string; label: string }
  seller_count: number
  totals: { delivered_count: number; total_sales_usd: number; total_fees_usd: number; net_usd: number }
  rows: PreviewRow[]
  error?: string
}

function isoToday() { return new Date().toISOString().slice(0, 10) }
function isoMinusDays(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }

export default function BillingPage() {
  const [preset, setPreset] = useState<Preset>('last_week')
  const [start, setStart] = useState(isoMinusDays(7))
  const [end, setEnd] = useState(isoToday())
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)

  const fetchPreview = async () => {
    setLoading(true); setError(null); setResult(null)
    try {
      const body: any = {}
      if (preset === 'custom') { body.start = start; body.end = end }
      else { body.preset = preset }
      const res = await fetch('/api/admin/billing/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const json: PreviewResponse = await res.json()
      if (!json.success) throw new Error(json.error || 'failed')
      setPreview(json)
      setSelected(new Set(json.rows.map(r => r.seller_id)))
    } catch (e: any) { setError(e?.message ?? 'unknown'); setPreview(null) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPreview() /* eslint-disable-next-line */ }, [])

  const filtered = useMemo(() => {
    if (!preview) return []
    const q = search.trim().toLowerCase()
    if (!q) return preview.rows
    return preview.rows.filter(r => r.seller_name.toLowerCase().includes(q) || r.seller_email.toLowerCase().includes(q))
  }, [preview, search])

  const selectedRows = useMemo(() => (preview?.rows ?? []).filter(r => selected.has(r.seller_id)), [preview, selected])
  const selectedTotals = useMemo(() => selectedRows.reduce((a, r) => ({
    delivered_count: a.delivered_count + r.delivered_count,
    total_sales_usd: a.total_sales_usd + r.total_sales_usd,
    total_fees_usd:  a.total_fees_usd  + r.total_fees_usd,
    net_usd:         a.net_usd         + r.net_usd,
  }), { delivered_count: 0, total_sales_usd: 0, total_fees_usd: 0, net_usd: 0 }), [selectedRows])

  const toggleAll = () => {
    if (!preview) return
    if (selected.size === preview.rows.length) setSelected(new Set())
    else setSelected(new Set(preview.rows.map(r => r.seller_id)))
  }
  const toggleOne = (id: string) => {
    const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n)
  }

  const handleSend = async () => {
    if (!preview || selectedRows.length === 0) return
    setSending(true)
    try {
      const body: any = { seller_ids: Array.from(selected) }
      if (preset === 'custom') { body.start = start; body.end = end }
      else { body.preset = preset }
      const res = await fetch('/api/admin/billing/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const json = await res.json()
      setResult(json)
      if (json.success) { setConfirming(false); await fetchPreview() }
    } catch (e: any) { setResult({ success: false, error: e?.message }) }
    finally { setSending(false) }
  }

  const Cell = ({ usd }: { usd: number }) => (
    <div className="text-right">
      <div className="text-sm font-bold text-[#1a1c3a]">{fmtUsd(usd)}</div>
      <div className="text-[10px] text-gray-400">{fmtKes(toKes(usd))}</div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <Header title="Weekly Billing" subtitle="Generate invoices, credit seller wallets · USD" />

      <div className="p-6 space-y-6">
        {/* Period selector */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarRange size={18} className="text-[#f4991a]" />
            <h2 className="text-base font-bold text-[#1a1c3a]">Billing period</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {([
              { key: 'last_week', label: 'Last week' },
              { key: 'this_week', label: 'This week' },
              { key: 'custom', label: 'Custom range' },
            ] as { key: Preset; label: string }[]).map(p => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                  preset === p.key ? 'bg-[#1a1c3a] text-white border-[#1a1c3a]' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100',
                )}
              >{p.label}</button>
            ))}
            <button
              onClick={fetchPreview}
              disabled={loading}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-[#1a1c3a] hover:bg-[#252750] disabled:opacity-50 text-white text-sm font-semibold rounded-xl"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <input type="date" value={start} onChange={e => setStart(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              <input type="date" value={end}   onChange={e => setEnd(e.target.value)}   className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
          )}
          <div className="mt-4 text-[11px] text-gray-400 bg-gray-50 rounded-lg p-3">
            Per-seller fees (confirmation, upsell, cross-sell, shipping) are configured on each seller's profile and applied automatically.
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
            <AlertTriangle size={16} className="text-red-500 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {result && (
          <div className={cn('rounded-2xl border p-5', result.success ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100')}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {result.success
                  ? <CheckCircle size={22} className="text-emerald-600" />
                  : <AlertTriangle size={22} className="text-red-600" />}
                <div>
                  <div className="font-bold text-[#1a1c3a]">
                    {result.success
                      ? `Generated ${result.sent} invoice${result.sent === 1 ? '' : 's'} · wallets credited`
                      : 'Failed'}
                  </div>
                  {result.error && <div className="text-sm text-red-600 mt-1 font-mono">{result.error}</div>}
                </div>
              </div>
              <button onClick={() => setResult(null)} className="text-gray-400"><X size={14} /></button>
            </div>
          </div>
        )}

        {/* Summary */}
        {preview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Sellers', value: preview.seller_count.toString(), icon: Users, money: false },
              { label: 'Delivered orders', value: preview.totals.delivered_count.toString(), icon: Package, money: false },
              { label: 'Gross sales', value: preview.totals.total_sales_usd, icon: Wallet, money: true },
              { label: 'Net payout', value: preview.totals.net_usd, icon: Sparkles, money: true },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
                  <s.icon size={16} className="text-[#f4991a]" />
                </div>
                {s.money ? (
                  <>
                    <div className="text-xl font-bold text-[#1a1c3a]">{fmtUsd(s.value as number)}</div>
                    <div className="text-[11px] text-gray-400">{fmtKes(toKes(s.value as number))}</div>
                  </>
                ) : (
                  <div className="text-3xl font-bold text-[#1a1c3a]">{s.value as string}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Sellers table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#1a1c3a]">Sellers in this period</h2>
              {preview && <p className="text-xs text-gray-400 mt-0.5">{preview.period.label} · {selected.size} of {preview.rows.length} selected</p>}
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                  className="w-56 pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs" />
              </div>
              <button
                disabled={!preview || selectedRows.length === 0 || sending}
                onClick={() => setConfirming(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#f4991a] hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
              >
                <Send size={14} /> Generate {selectedRows.length || 0} invoice{selectedRows.length === 1 ? '' : 's'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-5 py-3 w-10"><input type="checkbox" checked={preview ? selected.size === preview.rows.length && preview.rows.length > 0 : false} onChange={toggleAll} className="w-4 h-4 accent-[#f4991a]" /></th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Seller</th>
                  <th className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Orders</th>
                  <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Sales</th>
                  <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Fees</th>
                  <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading && <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm"><RefreshCw size={14} className="inline animate-spin mr-2" />Loading…</td></tr>}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-16 text-gray-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                    <div className="text-sm">No delivered orders for this period</div>
                  </td></tr>
                )}
                {!loading && filtered.map(row => {
                  const isSelected = selected.has(row.seller_id)
                  return (
                    <tr key={row.seller_id} onClick={() => toggleOne(row.seller_id)}
                      className={cn('cursor-pointer hover:bg-gray-50/60', isSelected && 'bg-orange-50/30')}>
                      <td className="px-5 py-4">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(row.seller_id)} onClick={e => e.stopPropagation()} className="w-4 h-4 accent-[#f4991a]" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-[#1a1c3a]">{row.seller_name}</div>
                        <div className="text-xs text-gray-400">{row.seller_email || 'no email'}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                          <Package size={10} /> {row.delivered_count}
                        </span>
                      </td>
                      <td className="px-4 py-4"><Cell usd={row.total_sales_usd} /></td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">−{fmtUsd(row.total_fees_usd)}</div>
                          <div className="text-[10px] text-gray-300">−{fmtKes(toKes(row.total_fees_usd))}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-right">
                          <div className="text-base font-bold text-[#f4991a]">{fmtUsd(row.net_usd)}</div>
                          <div className="text-[10px] text-gray-400">{fmtKes(toKes(row.net_usd))}</div>
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

      {/* Confirm modal */}
      {confirming && preview && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#1a1c3a]">Generate invoices</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedRows.length} invoice{selectedRows.length === 1 ? '' : 's'} for <strong>{preview.period.label}</strong>.
                Each seller's wallet will be credited automatically.
              </p>
            </div>
            <div className="p-6 space-y-3 bg-gray-50">
              {[
                { label: 'Sellers', value: selectedRows.length.toString() },
                { label: 'Delivered orders', value: selectedTotals.delivered_count.toString() },
                { label: 'Gross sales', value: fmtUsd(selectedTotals.total_sales_usd) },
                { label: 'Total fees', value: '−' + fmtUsd(selectedTotals.total_fees_usd) },
              ].map(s => (
                <div key={s.label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{s.label}</span>
                  <span className="font-semibold text-[#1a1c3a]">{s.value}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-200 flex justify-between items-end">
                <span className="text-sm font-bold text-[#1a1c3a]">Total payout</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#f4991a]">{fmtUsd(selectedTotals.net_usd)}</div>
                  <div className="text-xs text-gray-400">{fmtKes(toKes(selectedTotals.net_usd))}</div>
                </div>
              </div>
            </div>
            <div className="p-5 flex justify-end gap-3">
              <button disabled={sending} onClick={() => setConfirming(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-500">Cancel</button>
              <button disabled={sending} onClick={handleSend} className="flex items-center gap-2 px-5 py-2.5 bg-[#f4991a] hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl">
                {sending ? <><RefreshCw size={15} className="animate-spin" /> Generating…</> : <><Send size={15} /> Generate invoices</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
