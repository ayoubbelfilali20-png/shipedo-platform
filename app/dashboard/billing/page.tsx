'use client'

import { useState, useEffect, useMemo } from 'react'
import Header from '@/components/dashboard/Header'
import { cn } from '@/lib/utils'
import {
  CalendarRange, Send, RefreshCw, CheckCircle, AlertTriangle,
  Mail, Wallet, Users, Package, FileText, Download, Search,
  ChevronRight, X, Sparkles, Clock,
} from 'lucide-react'

type Preset = 'this_week' | 'last_week' | 'custom'

interface PreviewRow {
  seller_id:       string
  seller_name:     string
  seller_email:    string
  delivered_count: number
  gross_amount:    number
  delivery_fee:    number
  net_amount:      number
  currency:        string
  order_count:     number
}

interface PreviewResponse {
  success:      boolean
  period:       { start: string; end: string; label: string }
  delivery_fee: number
  currency:     string
  seller_count: number
  totals:       { delivered_count: number; gross_amount: number; delivery_fee: number; net_amount: number }
  rows:         PreviewRow[]
  error?:       string
}

interface SendResultRow {
  seller_id:    string
  seller_name:  string
  seller_email?: string
  status:       'sent' | 'failed' | 'skipped'
  net_amount?:  number
  reason?:      string
  message_id?:  string
}

interface SendResponse {
  success: boolean
  period:  { start: string; end: string; label: string }
  sent:    number
  failed:  number
  skipped: number
  total:   number
  results: SendResultRow[]
  message?:string
  error?:  string
}

function isoToday() { return new Date().toISOString().slice(0, 10) }
function isoMinusDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function BillingPage() {
  const [preset, setPreset]         = useState<Preset>('last_week')
  const [start, setStart]           = useState<string>(isoMinusDays(7))
  const [end, setEnd]               = useState<string>(isoToday())
  const [fee, setFee]               = useState<number>(30)
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<Set<string>>(new Set())

  const [loading, setLoading]       = useState(false)
  const [preview, setPreview]       = useState<PreviewResponse | null>(null)
  const [error, setError]           = useState<string | null>(null)

  const [confirming, setConfirming] = useState(false)
  const [sending, setSending]       = useState(false)
  const [result, setResult]         = useState<SendResponse | null>(null)

  /* ── Fetch preview ── */
  const fetchPreview = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const body: any = { delivery_fee: fee }
      if (preset === 'custom') { body.start = start; body.end = end }
      else                     { body.preset = preset }
      const res = await fetch('/api/admin/billing/preview', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json: PreviewResponse = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load preview')
      setPreview(json)
      setSelected(new Set(json.rows.map(r => r.seller_id)))
    } catch (e: any) {
      setError(e?.message ?? 'unknown error')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPreview() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  /* ── Filter ── */
  const filtered = useMemo(() => {
    if (!preview) return []
    const q = search.trim().toLowerCase()
    if (!q) return preview.rows
    return preview.rows.filter(r =>
      r.seller_name.toLowerCase().includes(q) ||
      r.seller_email.toLowerCase().includes(q)
    )
  }, [preview, search])

  const selectedRows = useMemo(
    () => (preview?.rows ?? []).filter(r => selected.has(r.seller_id)),
    [preview, selected]
  )

  const selectedTotals = useMemo(() => {
    return selectedRows.reduce(
      (acc, r) => {
        acc.delivered_count += r.delivered_count
        acc.gross_amount    += r.gross_amount
        acc.delivery_fee    += r.delivery_fee
        acc.net_amount      += r.net_amount
        return acc
      },
      { delivered_count: 0, gross_amount: 0, delivery_fee: 0, net_amount: 0 }
    )
  }, [selectedRows])

  const toggleAll = () => {
    if (!preview) return
    if (selected.size === preview.rows.length) setSelected(new Set())
    else setSelected(new Set(preview.rows.map(r => r.seller_id)))
  }

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const fmtMoney = (n: number) =>
    `${preview?.currency ?? 'MAD'} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  /* ── Send invoices ── */
  const handleSend = async () => {
    if (!preview || selectedRows.length === 0) return
    setSending(true)
    try {
      const body: any = {
        delivery_fee: fee,
        seller_ids:   Array.from(selected),
      }
      if (preset === 'custom') { body.start = start; body.end = end }
      else                     { body.preset = preset }

      const res = await fetch('/api/admin/billing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify(body),
      })
      const json: SendResponse = await res.json()
      setResult(json)
      if (json.success) {
        setConfirming(false)
        await fetchPreview()
      }
    } catch (e: any) {
      setResult({
        success: false,
        period:  preview.period,
        sent: 0, failed: 0, skipped: 0, total: 0,
        results: [],
        error:   e?.message ?? 'unknown error',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header title="Weekly Billing" subtitle="Send invoices and credit seller wallets in one click" />

      <div className="p-6 space-y-6">

        {/* Period selector + fee + refresh */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarRange size={18} className="text-[#f4991a]" />
            <h2 className="text-base font-bold text-[#1a1c3a]">Billing period</h2>
          </div>

          <div className="grid lg:grid-cols-[1fr_auto_auto] gap-4 items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'last_week', label: 'Last week' },
                  { key: 'this_week', label: 'This week' },
                  { key: 'custom',    label: 'Custom range' },
                ] as { key: Preset; label: string }[]).map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPreset(p.key)}
                    className={cn(
                      'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border',
                      preset === p.key
                        ? 'bg-[#1a1c3a] text-white border-[#1a1c3a]'
                        : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {preset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 mt-3 max-w-md">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Start</label>
                    <input
                      type="date"
                      value={start}
                      onChange={e => setStart(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">End (exclusive)</label>
                    <input
                      type="date"
                      value={end}
                      onChange={e => setEnd(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Delivery fee / order</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={fee}
                  onChange={e => setFee(parseFloat(e.target.value) || 0)}
                  className="w-32 px-3 py-2.5 pr-12 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">MAD</span>
              </div>
            </div>

            <button
              onClick={fetchPreview}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1a1c3a] hover:bg-[#252750] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh preview
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-700">Could not load billing preview</div>
              <div className="text-xs text-red-600 mt-0.5 font-mono">{error}</div>
            </div>
          </div>
        )}

        {/* Result banner */}
        {result && (
          <div className={cn(
            'rounded-2xl border p-5',
            result.success
              ? 'bg-emerald-50 border-emerald-100'
              : 'bg-red-50 border-red-100'
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  result.success ? 'bg-emerald-100' : 'bg-red-100'
                )}>
                  {result.success
                    ? <CheckCircle size={20} className="text-emerald-600" />
                    : <AlertTriangle size={20} className="text-red-600" />}
                </div>
                <div>
                  <div className="font-bold text-[#1a1c3a]">
                    {result.success
                      ? `Sent ${result.sent} invoice${result.sent === 1 ? '' : 's'} for ${result.period.label}`
                      : 'Sending failed'}
                  </div>
                  {result.message && <div className="text-sm text-gray-600 mt-1">{result.message}</div>}
                  {result.error   && <div className="text-sm text-red-600 mt-1 font-mono">{result.error}</div>}
                  {(result.sent > 0 || result.failed > 0 || result.skipped > 0) && (
                    <div className="flex flex-wrap gap-3 mt-2 text-xs">
                      <span className="text-emerald-700"><strong>{result.sent}</strong> sent</span>
                      {result.failed  > 0 && <span className="text-red-700"><strong>{result.failed}</strong> failed</span>}
                      {result.skipped > 0 && <span className="text-yellow-700"><strong>{result.skipped}</strong> skipped (no email)</span>}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setResult(null)} className="w-7 h-7 rounded-lg hover:bg-white/70 flex items-center justify-center text-gray-400">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Summary cards */}
        {preview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Sellers ready', value: preview.seller_count, icon: Users,   color: 'text-[#1a1c3a]', bg: 'bg-white'      },
              { label: 'Delivered orders', value: preview.totals.delivered_count, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Gross revenue',  value: fmtMoney(preview.totals.gross_amount), icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50', isMoney: true },
              { label: 'Net payout',     value: fmtMoney(preview.totals.net_amount),   icon: Sparkles, color: 'text-[#f4991a]',   bg: 'bg-orange-50',  isMoney: true },
            ].map(s => (
              <div key={s.label} className={cn('rounded-2xl border border-gray-100 p-5', s.bg)}>
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center', s.color)}>
                    <s.icon size={16} />
                  </div>
                </div>
                <div className={cn('font-bold text-[#1a1c3a]', s.isMoney ? 'text-xl' : 'text-3xl')}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Sellers table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <h2 className="text-base font-bold text-[#1a1c3a]">Sellers in this period</h2>
              {preview && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {preview.period.label} · {selected.size} of {preview.rows.length} selected
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search seller…"
                  className="w-56 pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                />
              </div>
              <button
                disabled={!preview || selectedRows.length === 0 || sending}
                onClick={() => setConfirming(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#f4991a] hover:bg-[#f8b44a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-orange-500/20"
              >
                <Send size={14} />
                Send to {selectedRows.length || 0} seller{selectedRows.length === 1 ? '' : 's'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-5 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={preview ? selected.size === preview.rows.length && preview.rows.length > 0 : false}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-[#f4991a] cursor-pointer"
                    />
                  </th>
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Seller</th>
                  <th className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Delivered</th>
                  <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Gross</th>
                  <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Fees</th>
                  <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Net payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading && (
                  <tr><td colSpan={6} className="text-center py-16">
                    <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
                      <RefreshCw size={14} className="animate-spin" />
                      Loading preview…
                    </div>
                  </td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-16">
                    <FileText size={36} className="mx-auto mb-2 text-gray-200" />
                    <div className="text-sm font-semibold text-gray-400">No delivered orders for this period</div>
                    <div className="text-xs text-gray-300 mt-1">Pick a different period or wait for more deliveries.</div>
                  </td></tr>
                )}
                {!loading && filtered.map(row => {
                  const isSelected = selected.has(row.seller_id)
                  const noEmail = !row.seller_email
                  return (
                    <tr
                      key={row.seller_id}
                      className={cn('table-row-hover cursor-pointer', isSelected && 'bg-orange-50/30')}
                      onClick={() => toggleOne(row.seller_id)}
                    >
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(row.seller_id)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 accent-[#f4991a] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f4991a] to-orange-600 text-white font-bold flex items-center justify-center text-sm flex-shrink-0">
                            {row.seller_name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#1a1c3a] truncate max-w-[220px]">{row.seller_name}</div>
                            <div className={cn('text-xs truncate max-w-[220px]', noEmail ? 'text-red-500' : 'text-gray-400')}>
                              {noEmail ? 'No email on file' : row.seller_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                          <Package size={11} />
                          {row.delivered_count}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-[#1a1c3a]">{fmtMoney(row.gross_amount)}</td>
                      <td className="px-4 py-4 text-right text-xs text-gray-500 hidden md:table-cell">−{fmtMoney(row.delivery_fee)}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="text-base font-bold text-[#f4991a]">{fmtMoney(row.net_amount)}</div>
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
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail size={20} className="text-[#f4991a]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1a1c3a]">Confirm weekly invoice run</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    This will send {selectedRows.length} email{selectedRows.length === 1 ? '' : 's'} and credit each
                    seller's wallet for <strong>{preview.period.label}</strong>. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3 bg-gray-50">
              {[
                { label: 'Sellers',          value: selectedRows.length.toString() },
                { label: 'Delivered orders', value: selectedTotals.delivered_count.toString() },
                { label: 'Gross revenue',    value: fmtMoney(selectedTotals.gross_amount) },
                { label: 'Delivery fees',    value: '−' + fmtMoney(selectedTotals.delivery_fee) },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{s.label}</span>
                  <span className="font-semibold text-[#1a1c3a]">{s.value}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm font-bold text-[#1a1c3a]">Total payout</span>
                <span className="text-xl font-bold text-[#f4991a]">{fmtMoney(selectedTotals.net_amount)}</span>
              </div>
            </div>
            <div className="p-5 flex items-center justify-end gap-3">
              <button
                disabled={sending}
                onClick={() => setConfirming(false)}
                className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={sending}
                onClick={handleSend}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#f4991a] hover:bg-[#f8b44a] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
              >
                {sending
                  ? <><RefreshCw size={15} className="animate-spin" /> Sending…</>
                  : <><Send size={15} /> Send invoices</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
