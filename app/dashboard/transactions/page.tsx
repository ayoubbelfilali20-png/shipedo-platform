'use client'

import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import { mockTransactions, mockSellerWallet, mockWithdrawRequests } from '@/lib/data'
import { Transaction, TransactionType, WithdrawRequest } from '@/lib/types'
import { formatDate, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Clock, Lock,
  CheckCircle, AlertTriangle, Search, Filter, Download,
  ChevronRight, Smartphone, Building2, Eye, EyeOff,
  TrendingUp, TrendingDown, RefreshCw, Info, X,
  Package, CreditCard, DollarSign, Banknote, History
} from 'lucide-react'

/* ─── helpers ─────────────────────────────────────── */

const typeConfig: Record<TransactionType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  cod_collected: { label: 'COD Collected',  icon: CreditCard,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  payout:        { label: 'Payout',         icon: Banknote,      color: 'text-blue-600',    bg: 'bg-blue-50'    },
  withdrawal:    { label: 'Withdrawal',     icon: ArrowUpRight,  color: 'text-[#f4991a]',   bg: 'bg-orange-50'  },
  hold:          { label: 'On Hold',        icon: Lock,          color: 'text-yellow-600',  bg: 'bg-yellow-50'  },
  hold_release:  { label: 'Hold Released',  icon: RefreshCw,     color: 'text-purple-600',  bg: 'bg-purple-50'  },
  refund:        { label: 'Refund',         icon: TrendingDown,  color: 'text-red-500',     bg: 'bg-red-50'     },
  fee:           { label: 'Delivery Fee',   icon: Package,       color: 'text-gray-500',    bg: 'bg-gray-50'    },
}

const statusConfig = {
  completed:  { label: 'Completed',  dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50'  },
  pending:    { label: 'Pending',    dot: 'bg-yellow-400',  text: 'text-yellow-700',  bg: 'bg-yellow-50'   },
  on_hold:    { label: 'On Hold',    dot: 'bg-orange-400',  text: 'text-orange-700',  bg: 'bg-orange-50'   },
  cancelled:  { label: 'Cancelled', dot: 'bg-gray-400',    text: 'text-gray-500',    bg: 'bg-gray-50'     },
}

/* ─── Transaction row ─────────────────────────────── */

function TxnRow({ txn, onClick }: { txn: Transaction; onClick: () => void }) {
  const tc = typeConfig[txn.type]
  const sc = statusConfig[txn.status]
  const isCredit = txn.direction === 'credit'

  return (
    <tr
      onClick={onClick}
      className="table-row-hover cursor-pointer"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', tc.bg)}>
            <tc.icon size={16} className={tc.color} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#1a1c3a] truncate max-w-[200px]">{txn.description}</div>
            <div className="text-xs text-gray-400 font-mono mt-0.5">{txn.reference}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 hidden md:table-cell">
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full', sc.text, sc.bg)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
          {sc.label}
        </span>
      </td>
      <td className="px-4 py-4 hidden lg:table-cell">
        <span className="text-xs text-gray-400">{formatDate(txn.createdAt)}</span>
      </td>
      <td className="px-4 py-4 text-right">
        <div className={cn('text-base font-bold', isCredit ? 'text-emerald-600' : 'text-[#1a1c3a]')}>
          {isCredit ? '+' : '−'} KES {txn.amount.toLocaleString()}
        </div>
        <div className="text-xs text-gray-400">{isCredit ? 'Credit' : 'Debit'}</div>
      </td>
    </tr>
  )
}

/* ─── Detail drawer ───────────────────────────────── */

function TxnDetail({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  const tc = typeConfig[txn.type]
  const sc = statusConfig[txn.status]
  const isCredit = txn.direction === 'credit'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm h-full shadow-2xl flex flex-col animate-slide-up overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="font-bold text-[#1a1c3a]">Transaction Detail</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 flex-1 space-y-5">
          {/* Amount hero */}
          <div className={cn('rounded-2xl p-6 text-center', isCredit ? 'bg-emerald-50' : 'bg-gray-50')}>
            <div className={cn('w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center', tc.bg)}>
              <tc.icon size={26} className={tc.color} />
            </div>
            <div className={cn('text-3xl font-bold', isCredit ? 'text-emerald-600' : 'text-[#1a1c3a]')}>
              {isCredit ? '+' : '−'} KES {txn.amount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mt-1">{tc.label}</div>
            <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mt-3', sc.text, sc.bg)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
              {sc.label}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-3">
            {[
              { label: 'Reference', value: txn.reference, mono: true },
              { label: 'Description', value: txn.description },
              txn.trackingNumber && { label: 'Order', value: txn.trackingNumber, mono: true },
              { label: 'Date', value: formatDateTime(txn.createdAt) },
              txn.processedAt && { label: 'Processed', value: formatDateTime(txn.processedAt) },
              txn.note && { label: 'Note', value: txn.note },
            ].filter(Boolean).map((item: any) => (
              <div key={item.label} className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-400 flex-shrink-0 pt-0.5">{item.label}</span>
                <span className={cn('text-xs font-semibold text-[#1a1c3a] text-right', item.mono && 'font-mono')}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Withdraw tab ─────────────────────────────────── */

function WithdrawTab({ wallet }: { wallet: typeof mockSellerWallet }) {
  const [method, setMethod] = useState<'mpesa' | 'bank' | 'airtel'>('mpesa')
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const amountNum = parseFloat(amount) || 0
  const fee = amountNum > 0 ? Math.max(30, amountNum * 0.005) : 0
  const youGet = amountNum - fee

  const quickAmounts = [1000, 5000, 10000, 20000]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1200))
    setSubmitting(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={40} className="text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-[#1a1c3a] mb-2">Withdrawal Requested!</h3>
        <p className="text-gray-400 text-sm mb-1">KES {amountNum.toLocaleString()} via {method === 'mpesa' ? 'M-Pesa' : method === 'airtel' ? 'Airtel Money' : 'Bank Transfer'}</p>
        <p className="text-gray-300 text-xs mb-8">You'll receive it within 24 hours</p>
        <button onClick={() => { setDone(false); setAmount(''); setPhone('') }} className="text-[#f4991a] text-sm font-semibold hover:underline">
          Make another withdrawal
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-5 py-2">
      {/* Available */}
      <div className="bg-gradient-to-r from-[#1a1c3a] to-[#252750] rounded-2xl p-5 flex items-center justify-between">
        <div>
          <div className="text-white/50 text-xs mb-1">Available to Withdraw</div>
          <div className="text-white font-bold text-2xl">KES {wallet.availableBalance.toLocaleString()}</div>
        </div>
        <div className="w-12 h-12 bg-[#f4991a]/20 rounded-xl flex items-center justify-center">
          <Banknote size={24} className="text-[#f4991a]" />
        </div>
      </div>

      {/* Method */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-2">Withdrawal Method</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'mpesa' as const, label: 'M-Pesa', icon: '📱', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
            { value: 'airtel' as const, label: 'Airtel Money', icon: '📲', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
            { value: 'bank' as const, label: 'Bank', icon: '🏦', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
          ].map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-semibold',
                method === m.value
                  ? `${m.border} ${m.bg} ${m.color}`
                  : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
              )}
            >
              <span className="text-xl">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-2">Amount (KES)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">KES</span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            max={wallet.availableBalance}
            min={100}
            className="w-full pl-14 pr-4 py-3.5 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] text-[#1a1c3a]"
            required
          />
        </div>
        {/* Quick amounts */}
        <div className="flex gap-2 mt-2">
          {quickAmounts.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(q.toString())}
              className="flex-1 text-xs font-semibold py-1.5 bg-gray-50 hover:bg-orange-50 hover:text-[#f4991a] text-gray-500 rounded-lg transition-all border border-gray-100 hover:border-orange-200"
            >
              {(q / 1000).toFixed(0)}K
            </button>
          ))}
        </div>
      </div>

      {/* Phone / account */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-2">
          {method === 'bank' ? 'Account Number' : 'Phone Number'}
        </label>
        <input
          type="text"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder={method === 'bank' ? 'e.g. 1234567890' : 'e.g. 0712345678'}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] font-mono"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-2">Account Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Full name on account"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
          required
        />
      </div>

      {/* Fee summary */}
      {amountNum > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-2">
          {[
            { label: 'Withdrawal Amount', value: `KES ${amountNum.toLocaleString()}` },
            { label: 'Transaction Fee (0.5%, min KES 30)', value: `− KES ${fee.toFixed(0)}` },
          ].map(r => (
            <div key={r.label} className="flex justify-between text-xs">
              <span className="text-gray-500">{r.label}</span>
              <span className="text-[#1a1c3a] font-medium">{r.value}</span>
            </div>
          ))}
          <div className="border-t border-orange-200 pt-2 flex justify-between">
            <span className="text-sm font-bold text-[#1a1c3a]">You Receive</span>
            <span className="text-sm font-bold text-emerald-600">KES {Math.max(0, youGet).toLocaleString()}</span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !amount || !phone || !name || amountNum > wallet.availableBalance || amountNum < 100}
        className="w-full py-4 bg-[#f4991a] hover:bg-[#f8b44a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <><Banknote size={18} /> Withdraw Now</>
        )}
      </button>

      {amountNum > wallet.availableBalance && (
        <p className="text-xs text-red-500 text-center flex items-center justify-center gap-1">
          <AlertTriangle size={12} /> Amount exceeds available balance
        </p>
      )}
    </form>
  )
}

/* ─── Hold tab ─────────────────────────────────────── */

function HoldTab() {
  const holdTxns = mockTransactions.filter(t => t.status === 'on_hold')
  const totalHeld = holdTxns.reduce((a, t) => a + t.amount, 0)

  return (
    <div className="space-y-4">
      {/* Hold summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={16} className="text-[#f4991a]" />
            <span className="text-xs font-semibold text-orange-700">On Hold</span>
          </div>
          <div className="text-2xl font-bold text-[#1a1c3a]">KES {mockSellerWallet.onHoldBalance.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">{holdTxns.length} order(s) pending</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-yellow-600" />
            <span className="text-xs font-semibold text-yellow-700">Pending Payout</span>
          </div>
          <div className="text-2xl font-bold text-[#1a1c3a]">KES {mockSellerWallet.pendingBalance.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">Next cycle: Jan 20</div>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Funds are held while your orders are in transit. They are released to your available balance once the delivery is confirmed or after <strong>7 days</strong> if uncontested.
        </p>
      </div>

      {/* Hold list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-bold text-[#1a1c3a]">Held Amounts</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {holdTxns.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No amounts on hold</div>
          ) : (
            holdTxns.map(txn => (
              <div key={txn.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lock size={16} className="text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#1a1c3a] truncate">{txn.description}</div>
                  <div className="text-xs text-gray-400 mt-0.5 font-mono">{txn.trackingNumber}</div>
                  {txn.note && (
                    <div className="text-xs text-yellow-600 mt-0.5">{txn.note}</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-[#f4991a]">KES {txn.amount.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{formatDate(txn.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Previous releases */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-bold text-[#1a1c3a]">Recently Released</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {mockTransactions.filter(t => t.type === 'hold_release').map(txn => (
            <div key={txn.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <RefreshCw size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#1a1c3a]">{txn.description}</div>
                <div className="text-xs text-gray-400">{formatDate(txn.createdAt)}</div>
              </div>
              <div className="text-sm font-bold text-emerald-600">+ KES {txn.amount.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ────────────────────────────────────── */

type Tab = 'history' | 'withdraw' | 'hold'

export default function TransactionsPage() {
  const [tab, setTab] = useState<Tab>('history')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null)
  const [balanceVisible, setBalanceVisible] = useState(true)

  const wallet = mockSellerWallet

  const filtered = mockTransactions.filter(t => {
    const matchSearch =
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.reference.toLowerCase().includes(search.toLowerCase()) ||
      (t.trackingNumber?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchType = typeFilter === 'all' || t.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="min-h-screen">
      <Header title="Transactions" subtitle="Wallet, history & withdrawals" />

      <div className="p-6 space-y-6">

        {/* ── Balance Card ───────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#1a1c3a] via-[#1e2248] to-[#252750] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          {/* background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f4991a]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/50 text-xs font-semibold uppercase tracking-widest">(*) Total Balance</span>
                  <button
                    onClick={() => setBalanceVisible(!balanceVisible)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    {balanceVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
                <div className="text-4xl font-bold tracking-tight">
                  {balanceVisible ? (
                    <>KES <span className="text-[#f4991a]">{wallet.totalBalance.toLocaleString()}</span></>
                  ) : (
                    <span className="tracking-widest text-white/40 text-3xl">••••••</span>
                  )}
                </div>
                <div className="text-white/40 text-xs mt-1">{wallet.sellerName}</div>
              </div>
              <div className="w-12 h-12 bg-[#f4991a] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Wallet size={22} className="text-white" />
              </div>
            </div>

            {/* Sub-balances */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Available', value: wallet.availableBalance, icon: CheckCircle, color: 'text-emerald-400', onClick: () => setTab('withdraw') },
                { label: 'On Hold',   value: wallet.onHoldBalance,   icon: Lock,        color: 'text-yellow-400', onClick: () => setTab('hold') },
                { label: 'Pending',   value: wallet.pendingBalance,  icon: Clock,       color: 'text-blue-400',   onClick: () => setTab('hold') },
              ].map(b => (
                <button
                  key={b.label}
                  onClick={b.onClick}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-left transition-all group"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <b.icon size={12} className={b.color} />
                    <span className="text-white/50 text-xs">{b.label}</span>
                  </div>
                  <div className="text-white font-bold text-sm">
                    {balanceVisible ? `KES ${b.value.toLocaleString()}` : '••••'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100">
            {([
              { key: 'history',  label: 'History',  icon: History },
              { key: 'withdraw', label: 'Withdraw', icon: Banknote },
              { key: 'hold',     label: 'Hold',     icon: Lock },
            ] as { key: Tab; label: string; icon: React.ElementType }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all border-b-2 -mb-px',
                  tab === t.key
                    ? 'text-[#f4991a] border-[#f4991a]'
                    : 'text-gray-400 border-transparent hover:text-gray-600'
                )}
              >
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">

            {/* ── History tab ──────────────────────────────── */}
            {tab === 'history' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search transactions..."
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
                    {(['all', 'cod_collected', 'payout', 'withdrawal', 'hold', 'refund', 'fee'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setTypeFilter(f)}
                        className={cn(
                          'flex-shrink-0 px-3 py-2 text-xs font-semibold rounded-xl transition-all',
                          typeFilter === f ? 'bg-[#1a1c3a] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        )}
                      >
                        {f === 'all' ? 'All' : typeConfig[f as TransactionType]?.label ?? f}
                      </button>
                    ))}
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-500 hover:bg-gray-100 flex-shrink-0">
                    <Download size={15} /> Export
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/70">
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Transaction</th>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Status</th>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Date</th>
                        <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-12 text-gray-400">
                            <History size={36} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No transactions found</p>
                          </td>
                        </tr>
                      ) : (
                        filtered.map(txn => (
                          <TxnRow key={txn.id} txn={txn} onClick={() => setSelectedTxn(txn)} />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary footer */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  {[
                    { label: 'Total Earned',    value: wallet.totalEarned,    color: 'text-emerald-600' },
                    { label: 'Total Withdrawn', value: wallet.totalWithdrawn, color: 'text-[#f4991a]' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                      <div className={cn('font-bold text-sm', s.color)}>KES {s.value.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Withdraw tab ─────────────────────────────── */}
            {tab === 'withdraw' && <WithdrawTab wallet={wallet} />}

            {/* ── Hold tab ─────────────────────────────────── */}
            {tab === 'hold' && <HoldTab />}

          </div>
        </div>
      </div>

      {/* Transaction detail drawer */}
      {selectedTxn && (
        <TxnDetail txn={selectedTxn} onClose={() => setSelectedTxn(null)} />
      )}
    </div>
  )
}
