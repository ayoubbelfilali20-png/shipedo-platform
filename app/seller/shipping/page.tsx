'use client'

import { useEffect, useState, useMemo } from 'react'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import {
  Download, Package, X, User, Phone, MapPin, Truck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ShipStatus = 'confirmed' | 'prepared' | 'shipped' | 'delivered' | 'returned' | 'cancelled'

type OrderRow = {
  id: string
  tracking_number: string
  customer_name: string
  customer_phone: string
  customer_city: string
  customer_address: string
  items: any[]
  total_amount: number
  status: string
  payment_method: string
  payment_status?: string | null
  notes?: string | null
  seller_id?: string | null
  created_at: string
}

const statusConfig: Record<ShipStatus, { label: string; color: string; border: string; dot: string }> = {
  confirmed:   { label: 'Confirmed',   color: 'text-emerald-600', border: 'border-emerald-400', dot: 'bg-emerald-400' },
  prepared:    { label: 'Prepared',    color: 'text-indigo-600',  border: 'border-indigo-400',  dot: 'bg-indigo-400'  },
  shipped:     { label: 'Shipped',     color: 'text-blue-600',    border: 'border-blue-400',    dot: 'bg-blue-400'    },
  delivered:   { label: 'Delivered',   color: 'text-sky-600',     border: 'border-sky-400',     dot: 'bg-sky-400'     },
  returned:    { label: 'Returned',    color: 'text-red-500',     border: 'border-red-400',     dot: 'bg-red-400'     },
  cancelled:   { label: 'Cancelled',   color: 'text-gray-500',    border: 'border-gray-300',    dot: 'bg-gray-400'    },
}

const allStatuses: ShipStatus[] = ['confirmed', 'prepared', 'shipped', 'delivered', 'returned', 'cancelled']

export default function SellerShippingPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<ShipStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<OrderRow | null>(null)
  const perPage = 10

  useEffect(() => {
    let sellerId: string | null = null
    try {
      const stored = localStorage.getItem('shipedo_seller')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.role === 'seller') sellerId = u.id
      }
    } catch {}
    if (!sellerId) { setLoading(false); return }
    // Pull every order for this seller that has moved past pending —
    // confirmed orders should appear here automatically as soon as the
    // call agent confirms them.
    supabase.from('orders')
      .select('*')
      .eq('seller_id', sellerId)
      .in('status', allStatuses)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data || []) as OrderRow[])
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => (
    filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus)
  ), [orders, filterStatus])

  const counts = useMemo(() => {
    const c: Record<ShipStatus, number> = { confirmed: 0, prepared: 0, shipped: 0, delivered: 0, returned: 0, cancelled: 0 }
    orders.forEach(o => { if (o.status in c) c[o.status as ShipStatus]++ })
    return c
  }, [orders])

  const total = filtered.length
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Header title="Shippings" subtitle={`${total} orders`} role="seller" />

      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
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
                {total === 0 ? 0 : (page - 1) * perPage + 1} - {Math.min(page * perPage, total)} / {total}
              </span>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-cyan-400 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all">
              <Download size={13} /> Excel
            </button>
          </div>

          <div className="grid grid-cols-[1.5fr_1fr_1.5fr_1.2fr_1.5fr_1.2fr] gap-3 px-5 py-3 bg-gray-50/80 border-b border-gray-100">
            {['TRACKING', 'DATE', 'CUSTOMER', 'ITEMS', 'AMOUNT', 'STATUS'].map(h => (
              <div key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</div>
            ))}
          </div>

          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
            ) : pageRows.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-gray-400">
                <Truck size={32} className="mb-2 opacity-30" />
                <p className="text-sm">No orders found</p>
              </div>
            ) : pageRows.map(row => {
              const cfg = statusConfig[(row.status as ShipStatus)] || statusConfig.confirmed
              const items = Array.isArray(row.items) ? row.items : []
              return (
                <button
                  key={row.id}
                  onClick={() => setSelected(row)}
                  className="w-full grid grid-cols-[1.5fr_1fr_1.5fr_1.2fr_1.5fr_1.2fr] gap-3 px-5 py-4 items-center hover:bg-orange-50/30 transition-colors text-left"
                >
                  <div className="font-mono text-xs text-[#1a1c3a] font-semibold truncate">{row.tracking_number}</div>
                  <div className="text-xs text-gray-500">{new Date(row.created_at).toLocaleDateString()}</div>
                  <div>
                    <p className="text-xs font-semibold text-[#1a1c3a] truncate">{row.customer_name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{row.customer_city}</p>
                  </div>
                  <div className="text-xs text-gray-600">
                    <span className="font-semibold text-[#f4991a]">{items.length}</span> item{items.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs font-bold text-[#1a1c3a]">KES {(row.total_amount || 0).toLocaleString()}</div>
                  <div>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 text-[10px] font-semibold',
                      cfg.color, cfg.border
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
                      {cfg.label}
                    </span>
                    {row.payment_status === 'paid' && (
                      <div className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full text-center w-fit mt-1">
                        PAID
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
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50">Prev</button>
                <button disabled={page * perPage >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && <OrderDetail row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function OrderDetail({ row, onClose }: { row: OrderRow; onClose: () => void }) {
  const cfg = statusConfig[(row.status as ShipStatus)] || statusConfig.confirmed
  const items = Array.isArray(row.items) ? row.items : []

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
          <div>
            <h2 className="font-bold text-[#1a1c3a] text-sm">Order Details</h2>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{row.tracking_number}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-bold',
              cfg.color, cfg.border
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
              {cfg.label}
            </span>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <User size={14} className="text-[#f4991a]" />
              <h3 className="text-xs font-bold text-[#1a1c3a] uppercase tracking-wide">Customer</h3>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f4991a] to-orange-400 flex items-center justify-center text-white font-bold text-sm">
                  {(row.customer_name || '?').charAt(0)}
                </div>
                <p className="text-sm font-bold text-[#1a1c3a]">{row.customer_name}</p>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Phone size={13} className="text-gray-400" />
                <span className="font-mono">{row.customer_phone}</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-gray-600">
                <MapPin size={13} className="text-gray-400 mt-0.5" />
                <span>{row.customer_address}, <strong>{row.customer_city}</strong></span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Truck size={14} className="text-[#f4991a]" />
              <h3 className="text-xs font-bold text-[#1a1c3a] uppercase tracking-wide">Shipping Info</h3>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Tracking</span>
                <span className="font-mono font-bold text-[#1a1c3a] text-xs">{row.tracking_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Date</span>
                <span className="font-semibold text-[#1a1c3a] text-xs">{new Date(row.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Payment Method</span>
                <span className="font-semibold text-[#1a1c3a] text-xs">{row.payment_method}</span>
              </div>
              {row.payment_status === 'paid' && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Payment Status</span>
                  <span className="font-semibold text-amber-600 text-xs">PAID</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package size={14} className="text-[#f4991a]" />
              <h3 className="text-xs font-bold text-[#1a1c3a] uppercase tracking-wide">Items</h3>
              <span className="text-xs bg-orange-50 text-[#f4991a] font-semibold px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                    <Package size={14} className="text-[#f4991a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1a1c3a] truncate">{p.name || 'Item'}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{p.sku || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#f4991a]">KES {(Number(p.unit_price) || Number(p.price) || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">×{p.quantity || 1}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between bg-[#1a1c3a] rounded-xl px-4 py-3">
              <span className="text-white/50 text-xs font-semibold">TOTAL</span>
              <span className="text-[#f4991a] font-bold">KES {(row.total_amount || 0).toLocaleString()}</span>
            </div>
          </div>

          {row.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-700 mb-1">Notes</p>
              <p className="text-xs text-amber-600">{row.notes}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mt-0.5">
              <Truck size={13} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-700">Status managed by call center</p>
              <p className="text-xs text-blue-500 mt-0.5 leading-relaxed">
                Order status (delivered, returned, cancelled) is updated by our call agents.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
