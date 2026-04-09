'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/dashboard/Header'
import Money from '@/components/Money'
import { fmtUsd, fmtKes, toKes } from '@/lib/currency'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  Wallet, ArrowDownToLine, Clock, CheckCircle, XCircle,
  TrendingUp, FileText, Send, X, AlertCircle,
} from 'lucide-react'

interface Tx {
  id: string
  type: 'invoice' | 'withdraw' | 'adjust'
  amount_usd: number
  note: string | null
  created_at: string
}

interface WithdrawReq {
  id: string
  amount_usd: number
  method: string
  account_details: string
  status: 'pending' | 'validated' | 'rejected'
  requested_at: string
  processed_at: string | null
}

export default function SellerWalletPage() {
  const [sellerId, setSellerId] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [txs, setTxs] = useState<Tx[]>([])
  const [requests, setRequests] = useState<WithdrawReq[]>([])
  const [loading, setLoading] = useState(true)

  // Withdraw modal
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'binance' | 'redotpay'>('binance')
  const [account, setAccount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (sid: string) => {
    setLoading(true)
    const [wRes, txRes, reqRes] = await Promise.all([
      supabase.from('seller_wallets').select('balance_usd').eq('seller_id', sid).maybeSingle(),
      supabase.from('wallet_transactions').select('*').eq('seller_id', sid).order('created_at', { ascending: false }).limit(50),
      supabase.from('withdraw_requests').select('*').eq('seller_id', sid).order('requested_at', { ascending: false }).limit(20),
    ])
    setBalance(Number(wRes.data?.balance_usd ?? 0))
    setTxs((txRes.data ?? []) as Tx[])
    setRequests((reqRes.data ?? []) as WithdrawReq[])
    setLoading(false)
  }

  useEffect(() => {
    try {
      const u = localStorage.getItem('shipedo_seller')
      if (u) {
        const parsed = JSON.parse(u)
        if (parsed.role === 'seller') {
          setSellerId(parsed.id)
          load(parsed.id)
          return
        }
      }
    } catch {}
    setLoading(false)
  }, [])

  const pendingLocked = requests.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount_usd), 0)
  const available = Math.max(0, balance - pendingLocked)

  const submitWithdraw = async () => {
    if (!sellerId) return
    setError(null)
    const amt = Number(amount)
    if (!amt || amt <= 0) { setError('Enter an amount'); return }
    if (!account.trim()) { setError('Enter account details'); return }
    if (amt > available) { setError(`Max available: ${fmtUsd(available)}`); return }

    setSubmitting(true)
    const res = await fetch('/api/seller/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-seller-id': sellerId },
      body: JSON.stringify({ amount_usd: amt, method, account_details: account.trim() }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!json.ok) { setError(json.error || 'failed'); return }
    setOpen(false)
    setAmount(''); setAccount('')
    await load(sellerId)
  }

  return (
    <div className="min-h-screen">
      <Header title="My Wallet" subtitle="Balance is held in USD. Withdraw to Binance or RedotPay." role="seller" />

      <div className="px-6 pt-6 pb-10 space-y-6 max-w-5xl">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-[#1a1c3a] to-[#252750] rounded-3xl shadow-lg p-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-widest font-bold mb-2">
                <Wallet size={14} /> Available balance
              </div>
              <div className="text-5xl font-extrabold">{fmtUsd(available)}</div>
              <div className="text-white/40 text-sm mt-1 font-medium">{fmtKes(toKes(available))}</div>
              {pendingLocked > 0 && (
                <div className="text-xs text-orange-300 mt-3 flex items-center gap-1">
                  <Clock size={12} /> {fmtUsd(pendingLocked)} locked in pending withdrawals
                </div>
              )}
            </div>
            <button
              onClick={() => setOpen(true)}
              disabled={available <= 0}
              className="flex items-center gap-2 px-5 py-3 bg-[#f4991a] hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg transition-all"
            >
              <ArrowDownToLine size={16} /> Withdraw
            </button>
          </div>
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Total balance</div>
              <div className="text-lg font-bold mt-1">{fmtUsd(balance)}</div>
            </div>
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Exchange rate</div>
              <div className="text-lg font-bold mt-1">1 USD = 130 KES</div>
            </div>
          </div>
        </div>

        {/* Pending requests */}
        {requests.filter(r => r.status === 'pending').length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-[#1a1c3a] mb-3">Pending withdraw requests</h3>
            <div className="space-y-2">
              {requests.filter(r => r.status === 'pending').map(r => (
                <div key={r.id} className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#1a1c3a]">{fmtUsd(Number(r.amount_usd))}</div>
                    <div className="text-xs text-gray-500 capitalize">{r.method} · {r.account_details}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-white px-3 py-1.5 rounded-full border border-orange-200">
                    <Clock size={12} /> Awaiting validation
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction history */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1a1c3a]">Transaction history</h3>
            <span className="text-xs text-gray-400">{txs.length} entries</span>
          </div>
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
          ) : txs.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              No transactions yet
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {txs.map(t => {
                const isCredit = Number(t.amount_usd) > 0
                return (
                  <div key={t.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                        isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500',
                      )}>
                        {isCredit ? <TrendingUp size={15} /> : <ArrowDownToLine size={15} />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#1a1c3a] capitalize">{t.type}</div>
                        <div className="text-xs text-gray-400 truncate">{t.note}</div>
                        <div className="text-[10px] text-gray-300 mt-0.5">{new Date(t.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={cn('text-sm font-bold', isCredit ? 'text-emerald-600' : 'text-red-500')}>
                        {isCredit ? '+' : ''}{fmtUsd(Number(t.amount_usd))}
                      </div>
                      <div className="text-[10px] text-gray-400">{fmtKes(toKes(Math.abs(Number(t.amount_usd))))}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Withdraw modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#1a1c3a] px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Withdraw funds</p>
                <p className="text-white font-bold mt-0.5">Available: {fmtUsd(available)}</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Amount (USD)</label>
                <input
                  type="number" min="1" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                  placeholder="0.00"
                />
                {amount && Number(amount) > 0 && (
                  <p className="text-xs text-gray-400 mt-1">≈ {fmtKes(toKes(Number(amount)))}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['binance', 'redotpay'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={cn(
                        'py-3 rounded-xl text-sm font-bold border-2 transition-all capitalize',
                        method === m ? 'border-[#f4991a] bg-orange-50 text-[#f4991a]' : 'border-gray-200 text-gray-500 hover:border-gray-300',
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  {method === 'binance' ? 'Binance Pay ID / wallet address' : 'RedotPay account ID'}
                </label>
                <input
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                  placeholder={method === 'binance' ? '123456789' : 'RDP-XXXXXX'}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <button
                onClick={submitWithdraw}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#f4991a] hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
              >
                {submitting ? 'Submitting…' : <><Send size={15} /> Submit request</>}
              </button>
              <p className="text-[11px] text-gray-400 text-center">Admin will validate and send the funds within 24h.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
