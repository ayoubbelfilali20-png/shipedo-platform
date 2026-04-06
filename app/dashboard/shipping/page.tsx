'use client'

import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import { mockOrders } from '@/lib/data'
import { Order } from '@/lib/types'
import {
  Truck, CheckCircle, RotateCcw, Calendar, ChevronDown,
  Download, ChevronRight, Package
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ShipStatus = 'shipped' | 'delivered' | 'paid' | 'returned' | 'rescheduled'

const statusConfig: Record<ShipStatus, { label: string; color: string; bg: string; border: string }> = {
  shipped:     { label: 'Shipped',     color: 'text-blue-600',    bg: 'bg-white',        border: 'border-blue-400'   },
  delivered:   { label: 'Delivered',   color: 'text-emerald-600', bg: 'bg-white',        border: 'border-emerald-400'},
  paid:        { label: 'Paid',        color: 'text-amber-600',   bg: 'bg-white',        border: 'border-amber-400'  },
  returned:    { label: 'Returned',    color: 'text-red-500',     bg: 'bg-white',        border: 'border-red-400'    },
  rescheduled: { label: 'Rescheduled', color: 'text-purple-600',  bg: 'bg-white',        border: 'border-purple-400' },
}

const allStatuses: ShipStatus[] = ['shipped', 'delivered', 'paid', 'returned', 'rescheduled']

// Map existing order statuses to ship statuses
function toShipStatus(status: string): ShipStatus {
  if (status === 'delivered') return 'delivered'
  if (status === 'shipped')   return 'shipped'
  if (status === 'returned')  return 'returned'
  return 'shipped'
}

// Build rows from mock orders (use all orders for demo)
const baseRows = mockOrders.map(o => ({
  id: o.id,
  orderId: o.id.toUpperCase().replace('-', '_'),
  subuser: o.sellerName?.split(' ')[0]?.toUpperCase() ?? 'STORE',
  source: 'STOREEP',
  shippingDate: o.createdAt.split('T')[0],
  trackingNumber: o.trackingNumber,
  products: o.products,
  status: toShipStatus(o.status),
  paidAt: o.deliveredAt ? o.deliveredAt.split('T')[0] : null,
}))

type Row = typeof baseRows[0]

export default function ShippingPage() {
  const [rows, setRows] = useState(baseRows)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<ShipStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const perPage = 10

  const filtered = filterStatus === 'all' ? rows : rows.filter(r => r.status === filterStatus)
  const total = filtered.length
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  const setStatus = (id: string, status: ShipStatus) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, status, paidAt: status === 'paid' ? new Date().toISOString().split('T')[0] : r.paidAt } : r))
  }

  const counts = allStatuses.reduce((acc, s) => {
    acc[s] = rows.filter(r => r.status === s).length
    return acc
  }, {} as Record<ShipStatus, number>)

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Header title="Shippings" subtitle={`${total} orders`} />

      <div className="p-6 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          {allStatuses.map(s => {
            const cfg = statusConfig[s]
            return (
              <button
                key={s}
                onClick={() => { setFilterStatus(filterStatus === s ? 'all' : s); setPage(1) }}
                className={cn(
                  'bg-white rounded-xl border shadow-sm p-3.5 text-left transition-all hover:shadow-md',
                  filterStatus === s ? `border-2 ${cfg.border}` : 'border-gray-100'
                )}
              >
                <p className={cn('text-xl font-bold', cfg.color)}>{counts[s]}</p>
                <p className="text-xs text-gray-400 mt-0.5">{cfg.label}</p>
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Table header bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-[#1a1c3a]">Shippings</h2>
              <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                {(page - 1) * perPage + 1} - {Math.min(page * perPage, total)} / {total}
              </span>
              <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#1a1c3a] transition-colors">
                <ChevronDown size={13} />
              </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-cyan-400 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all">
              <Download size={13} /> Excel
            </button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1.5fr_1fr_1.2fr] gap-3 px-5 py-3 bg-gray-50/80 border-b border-gray-100">
            {['ORDER ID', 'SUBUSER', 'SOURCE', 'SHIPPING DATE', 'TRACKING NUMBER', 'ORDER', 'UP/CROSS SELL', 'STATUS'].map(h => (
              <div key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {pageRows.map(row => (
              <TableRow
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                onSetStatus={(s) => setStatus(row.id, s)}
              />
            ))}
          </div>

          {/* Pagination */}
          {total > perPage && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
              <span className="text-xs text-gray-400">{(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-all"
                >
                  Prev
                </button>
                <button
                  disabled={page * perPage >= total}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Table Row ── */
function TableRow({ row, expanded, onToggle, onSetStatus }: {
  row: Row
  expanded: boolean
  onToggle: () => void
  onSetStatus: (s: ShipStatus) => void
}) {
  const [statusOpen, setStatusOpen] = useState(false)
  const cfg = statusConfig[row.status]

  return (
    <>
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1.5fr_1fr_1.2fr] gap-3 px-5 py-4 items-center hover:bg-gray-50/50 transition-colors">
        {/* Order ID */}
        <div className="font-mono text-xs text-gray-700 truncate" title={row.orderId}>
          {row.orderId}
        </div>

        {/* Subuser */}
        <div className="text-xs text-gray-500">{row.subuser}</div>

        {/* Source */}
        <div className="text-xs text-gray-500">{row.source}</div>

        {/* Shipping Date */}
        <div className="text-xs text-gray-600">{row.shippingDate}</div>

        {/* Tracking Number */}
        <div className="font-mono text-xs text-[#1a1c3a] font-semibold truncate" title={row.trackingNumber}>
          {row.trackingNumber}
        </div>

        {/* Order (products expand) */}
        <div>
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#f4991a] transition-colors"
          >
            <span className="font-semibold text-[#f4991a]">{row.products.length}</span>
            <span>Product{row.products.length !== 1 ? 's' : ''}</span>
            <ChevronDown size={12} className={cn('transition-transform text-gray-400', expanded && 'rotate-180')} />
          </button>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Quantity:{row.products.reduce((a, p) => a + p.quantity, 0)}
          </p>
        </div>

        {/* Up/Cross sell */}
        <div className="flex items-center gap-1.5">
          <button className="w-6 h-6 rounded-full border-2 border-red-300 bg-red-50 flex items-center justify-center hover:bg-red-100 transition-all" title="Upsell">
            <span className="text-red-400 font-bold text-[10px]">!</span>
          </button>
          <button className="w-6 h-6 rounded-full border-2 border-red-300 bg-red-50 flex items-center justify-center hover:bg-red-100 transition-all" title="Cross-sell">
            <span className="text-red-400 font-bold text-[10px]">!</span>
          </button>
        </div>

        {/* Status */}
        <div className="relative">
          <div className="space-y-1">
            <button
              onClick={() => setStatusOpen(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all',
                cfg.color, cfg.border
              )}
            >
              {cfg.label}
              <ChevronDown size={10} className={cn('transition-transform', statusOpen && 'rotate-180')} />
            </button>
            {row.paidAt && row.status === 'paid' && (
              <div className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full text-center">
                PaidAt ({row.paidAt})
              </div>
            )}
          </div>

          {/* Status dropdown */}
          {statusOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 min-w-[140px]">
              {allStatuses.map(s => {
                const c = statusConfig[s]
                return (
                  <button
                    key={s}
                    onClick={() => { onSetStatus(s); setStatusOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors text-left',
                      row.status === s ? c.color : 'text-gray-600'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', {
                      'bg-blue-400':    s === 'shipped',
                      'bg-emerald-400': s === 'delivered',
                      'bg-amber-400':   s === 'paid',
                      'bg-red-400':     s === 'returned',
                      'bg-purple-400':  s === 'rescheduled',
                    })} />
                    {c.label}
                    {row.status === s && <CheckCircle size={11} className="ml-auto" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Expanded products */}
      {expanded && (
        <div className="px-5 pb-4 bg-gray-50/50 border-b border-gray-100">
          <div className="ml-[calc(2fr)] space-y-1.5 pt-1">
            {row.products.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
                <Package size={12} className="text-[#f4991a] flex-shrink-0" />
                <span className="font-semibold text-[#1a1c3a]">{p.name}</span>
                <span className="text-gray-400">SKU: {p.sku}</span>
                <span className="ml-auto text-[#f4991a] font-semibold">×{p.quantity}</span>
                <span className="text-gray-500">KES {p.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
