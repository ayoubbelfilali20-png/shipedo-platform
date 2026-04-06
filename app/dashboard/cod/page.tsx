'use client'

import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import { mockCODTransactions } from '@/lib/data'
import { formatDate } from '@/lib/utils'
import {
  CreditCard, CheckCircle, Clock, TrendingUp, Download,
  ArrowUpRight, DollarSign, AlertCircle, RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CODPage() {
  const [filter, setFilter] = useState<'all' | 'pending_collection' | 'collected' | 'paid_out'>('all')

  const filtered = mockCODTransactions.filter(
    (t) => filter === 'all' || t.status === filter
  )

  const totalPending = mockCODTransactions
    .filter((t) => t.status === 'pending_collection')
    .reduce((a, t) => a + t.amount, 0)

  const totalCollected = mockCODTransactions
    .filter((t) => t.status === 'collected')
    .reduce((a, t) => a + t.amount, 0)

  const statusConfig = {
    pending_collection: { label: 'Pending Collection', className: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-500' },
    collected: { label: 'Collected', className: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
    paid_out: { label: 'Paid Out', className: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    disputed: { label: 'Disputed', className: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
  }

  return (
    <div className="min-h-screen">
      <Header
        title="COD Tracking"
        subtitle="Cash on delivery management & payouts"
        action={{ label: 'Process Payout', onClick: () => {} }}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Total COD Value',
              value: `KES ${mockCODTransactions.reduce((a, t) => a + t.amount, 0).toLocaleString()}`,
              icon: DollarSign,
              color: 'text-[#f4991a]',
              bg: 'bg-orange-50',
              sub: 'All time',
            },
            {
              label: 'Pending Collection',
              value: `KES ${totalPending.toLocaleString()}`,
              icon: Clock,
              color: 'text-yellow-600',
              bg: 'bg-yellow-50',
              sub: `${mockCODTransactions.filter(t => t.status === 'pending_collection').length} orders`,
            },
            {
              label: 'Collected',
              value: `KES ${totalCollected.toLocaleString()}`,
              icon: CheckCircle,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
              sub: 'Awaiting payout',
            },
            {
              label: 'Paid Out',
              value: `KES 0`,
              icon: TrendingUp,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
              sub: 'To sellers',
            },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className={`${s.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div className="text-xl font-bold text-[#1a1c3a]">{s.value}</div>
              <div className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</div>
              <div className="text-xs text-gray-400 mt-1">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Payout summary per seller */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#1a1c3a]">Pending Payouts by Seller</h2>
            <button className="flex items-center gap-2 text-xs text-[#f4991a] font-semibold hover:underline">
              <Download size={14} /> Export Report
            </button>
          </div>

          <div className="space-y-3">
            {[
              { seller: 'TechHub Kenya', orders: 1, amount: 3500, status: 'ready' },
              { seller: 'StyleKe', orders: 1, amount: 4200, status: 'pending' },
              { seller: 'ModestFashion', orders: 1, amount: 3000, status: 'pending' },
              { seller: 'FitStore Kenya', orders: 1, amount: 5500, status: 'pending' },
            ].map((row) => (
              <div key={row.seller} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all">
                <div className="w-10 h-10 bg-gradient-to-br from-[#1a1c3a] to-[#252750] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {row.seller[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#1a1c3a]">{row.seller}</div>
                  <div className="text-xs text-gray-400">{row.orders} collected order(s)</div>
                </div>
                <div className="text-right mr-4">
                  <div className="text-sm font-bold text-[#1a1c3a]">KES {row.amount.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Due</div>
                </div>
                <button className={cn(
                  'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex-shrink-0',
                  row.status === 'ready'
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                )}>
                  {row.status === 'ready' ? (
                    <><ArrowUpRight size={12} /> Pay Now</>
                  ) : (
                    <><Clock size={12} /> Pending</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction log */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1a1c3a]">Transaction Log</h2>
              <div className="flex gap-2">
                {(['all', 'pending_collection', 'collected', 'paid_out'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                      filter === f ? 'bg-[#1a1c3a] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    )}
                  >
                    {f === 'all' ? 'All' : f === 'pending_collection' ? 'Pending' : f === 'collected' ? 'Collected' : 'Paid Out'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Order</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Seller</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((txn) => {
                  const sc = statusConfig[txn.status]
                  return (
                    <tr key={txn.id} className="table-row-hover">
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-semibold text-[#1a1c3a]">{txn.trackingNumber}</div>
                        <div className="text-xs text-gray-400 mt-0.5">#{txn.orderId}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-[#1a1c3a]">{txn.customerName}</div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="text-xs text-gray-500">{txn.sellerName}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-[#f4991a]">KES {txn.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full', sc.className)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-xs text-gray-400">
                          {txn.collectedAt ? formatDate(txn.collectedAt) : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
