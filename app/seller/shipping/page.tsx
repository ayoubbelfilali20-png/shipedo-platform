'use client'

import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import { mockOrders } from '@/lib/data'
import {
  ChevronDown, Download, Package, X,
  User, Phone, MapPin, Hash, Calendar,
  Truck, CheckCircle, RotateCcw, Clock, CreditCard
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ShipStatus = 'shipped' | 'delivered' | 'paid' | 'returned' | 'rescheduled'

const statusConfig: Record<ShipStatus, { label: string; color: string; border: string; dot: string }> = {
  shipped:     { label: 'Shipped',     color: 'text-blue-600',    border: 'border-blue-400',    dot: 'bg-blue-400'    },
  delivered:   { label: 'Delivered',   color: 'text-emerald-600', border: 'border-emerald-400', dot: 'bg-emerald-400' },
  paid:        { label: 'Paid',        color: 'text-amber-600',   border: 'border-amber-400',   dot: 'bg-amber-400'   },
  returned:    { label: 'Returned',    color: 'text-red-500',     border: 'border-red-400',     dot: 'bg-red-400'     },
  rescheduled: { label: 'Rescheduled', color: 'text-purple-600',  border: 'border-purple-400',  dot: 'bg-purple-400'  },
}

function toShipStatus(status: string): ShipStatus {
  if (status === 'delivered') return 'delivered'
  if (status === 'shipped')   return 'shipped'
  if (status === 'returned')  return 'returned'
  return 'shipped'
}

const sellerRows = mockOrders
  .filter(o => o.sellerId === 'sel-001')
  .map(o => ({
    id: o.id,
    orderId: o.id.toUpperCase().replace('-', '_'),
    shippingDate: o.createdAt.split('T')[0],
    trackingNumber: o.trackingNumber,
    products: o.products,
    totalAmount: o.totalAmount,
    paymentMethod: o.paymentMethod,
    status: toShipStatus(o.status),
    paidAt: o.deliveredAt ? o.deliveredAt.split('T')[0] : null,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerCity: o.customerCity,
    customerAddress: o.customerAddress,
    notes: o.notes,
    createdAt: o.createdAt,
  }))

type Row = typeof sellerRows[0]

export default function SellerShippingPage() {
  const [filterStatus, setFilterStatus] = useState<ShipStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Row | null>(null)
  const perPage = 10

  const allStatuses: ShipStatus[] = ['shipped', 'delivered', 'paid', 'returned', 'rescheduled']
  const filtered = filterStatus === 'all' ? sellerRows : sellerRows.filter(r => r.status === filterStatus)
  const total = filtered.length
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  const counts = allStatuses.reduce((acc, s) => {
    acc[s] = sellerRows.filter(r => r.status === s).length
    return acc
  }, {} as Record<ShipStatus, number>)

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Header title="Shippings" subtitle={`${total} orders`} role="seller" />

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
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-[#1a1c3a]">Shippings</h2>
              <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                {(page - 1) * perPage + 1} - {Math.min(page * perPage, total)} / {total}
              </span>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-cyan-400 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all">
              <Download size={13} /> Excel
            </button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr_1.5fr_1.2fr] gap-3 px-5 py-3 bg-gray-50/80 border-b border-gray-100">
            {['ORDER ID', 'DATE', 'TRACKING NUMBER', 'ORDER', 'CUSTOMER', 'STATUS'].map(h => (
              <div key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</div>
            ))}
          </div>

          <div className="divide-y divide-gray-50">
            {pageRows.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-gray-400">
                <Truck size={32} className="mb-2 opacity-30" />
                <p className="text-sm">No orders found</p>
              </div>
            ) : pageRows.map(row => {
              const cfg = statusConfig[row.status]
              return (
                <button
                  key={row.id}
                  onClick={() => setSelected(row)}
                  className="w-full grid grid-cols-[2fr_1fr_1.5fr_1.5fr_1.5fr_1.2fr] gap-3 px-5 py-4 items-center hover:bg-orange-50/30 transition-colors text-left group"
                >
                  {/* Order ID */}
                  <div className="font-mono text-xs text-gray-700 truncate group-hover:text-[#f4991a] transition-colors">{row.orderId}</div>
                  {/* Date */}
                  <div className="text-xs text-gray-500">{row.shippingDate}</div>
                  {/* Tracking */}
                  <div className="font-mono text-xs text-[#1a1c3a] font-semibold truncate">{row.trackingNumber}</div>
                  {/* Order */}
                  <div>
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold text-[#f4991a]">{row.products.length}</span> Product{row.products.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-[10px] text-gray-400">Qty: {row.products.reduce((a, p) => a + p.quantity, 0)}</p>
                  </div>
                  {/* Customer */}
                  <div>
                    <p className="text-xs font-semibold text-[#1a1c3a] truncate">{row.customerName}</p>
                    <p className="text-[10px] text-gray-400 truncate">{row.customerCity}</p>
                  </div>
                  {/* Status — read only */}
                  <div className="space-y-1">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-semibold',
                      cfg.color, cfg.border
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
                      {cfg.label}
                    </span>
                    {row.paidAt && row.status === 'paid' && (
                      <div className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full text-center w-fit">
                        PaidAt ({row.paidAt})
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {total > perPage && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
              <span className="text-xs text-gray-400">{(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-all">Prev</button>
                <button disabled={page * perPage >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-all">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && <OrderDetail row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

/* ── Order Detail Slide-in ── */
function OrderDetail({ row, onClose }: { row: Row; onClose: () => void }) {
  const cfg = statusConfig[row.status]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
          <div>
            <h2 className="font-bold text-[#1a1c3a] text-sm">Order Details</h2>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{row.orderId}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-bold',
              cfg.color, cfg.border
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
              {cfg.label}
            </span>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <User size={14} className="text-[#f4991a]" />
              <h3 className="text-xs font-bold text-[#1a1c3a] uppercase tracking-wide">Customer</h3>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f4991a] to-orange-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {row.customerName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1a1c3a]">{row.customerName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Phone size={13} className="text-gray-400 flex-shrink-0" />
                <a href={`tel:${row.customerPhone}`} className="hover:text-[#f4991a] transition-colors font-mono">
                  {row.customerPhone}
                </a>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-gray-600">
                <MapPin size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{row.customerAddress}, <strong>{row.customerCity}</strong></span>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Truck size={14} className="text-[#f4991a]" />
              <h3 className="text-xs font-bold text-[#1a1c3a] uppercase tracking-wide">Shipping Info</h3>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Tracking Number</span>
                <span className="font-mono font-bold text-[#1a1c3a] text-xs">{row.trackingNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Shipping Date</span>
                <span className="font-semibold text-[#1a1c3a] text-xs">{row.shippingDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Payment</span>
                <span className="font-semibold text-[#1a1c3a] text-xs">{row.paymentMethod}</span>
              </div>
              {row.paidAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Paid At</span>
                  <span className="font-semibold text-amber-600 text-xs">{row.paidAt}</span>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package size={14} className="text-[#f4991a]" />
              <h3 className="text-xs font-bold text-[#1a1c3a] uppercase tracking-wide">Products</h3>
              <span className="text-xs bg-orange-50 text-[#f4991a] font-semibold px-2 py-0.5 rounded-full">{row.products.length}</span>
            </div>
            <div className="space-y-2">
              {row.products.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <Package size={14} className="text-[#f4991a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1a1c3a] truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{p.sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-[#f4991a]">KES {p.price.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">×{p.quantity}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-3 flex items-center justify-between bg-[#1a1c3a] rounded-xl px-4 py-3">
              <span className="text-white/50 text-xs font-semibold">TOTAL</span>
              <span className="text-[#f4991a] font-bold">KES {row.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Notes */}
          {row.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-700 mb-1">Notes</p>
              <p className="text-xs text-amber-600">{row.notes}</p>
            </div>
          )}

          {/* Status info (read-only) */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Truck size={13} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-700">Status managed by Shipedo</p>
              <p className="text-xs text-blue-500 mt-0.5 leading-relaxed">
                Order status is updated by our agents and admin team. Contact support if you have any concerns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
