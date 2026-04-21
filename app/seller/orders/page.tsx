'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import {
  Search, Download, Eye, Pencil, Plus, Upload, FileSpreadsheet,
  ChevronLeft, ChevronRight, ChevronDown, Phone, Clock, Package, Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT, type TKey } from '@/lib/i18n'
import OrderItemsDetails from '@/components/OrderItemsDetails'

type OrderRow = {
  id: string
  tracking_number: string
  seller_id: string
  customer_name: string
  customer_phone: string
  customer_city: string
  customer_address: string
  country: string
  items: any[]
  total_amount: number
  original_total?: number | null
  status: string
  payment_method: string
  source?: string
  subuser?: string
  created_at: string
  call_attempts?: number
  reminded_at?: string | null
  cancel_reason?: string | null
}

const statusConfig: Record<string, { labelKey: TKey; color: string; bg: string; border: string }> = {
  pending:   { labelKey: 'ord_filter_pending',   color: 'text-rose-500',     bg: 'bg-white', border: 'border-rose-300'    },
  confirmed: { labelKey: 'ord_filter_confirmed', color: 'text-emerald-600',  bg: 'bg-white', border: 'border-emerald-400' },
  shipped:   { labelKey: 'ord_filter_shipped',   color: 'text-indigo-600',  bg: 'bg-white', border: 'border-indigo-300' },
  delivered: { labelKey: 'ord_filter_delivered', color: 'text-sky-600',     bg: 'bg-white', border: 'border-sky-300'    },
  returned:  { labelKey: 'ord_filter_returned',  color: 'text-red-600',     bg: 'bg-white', border: 'border-red-300'    },
  cancelled: { labelKey: 'ord_filter_cancelled', color: 'text-gray-500',    bg: 'bg-white', border: 'border-gray-300'   },
}

const CONFIRMATION_STATUSES = ['pending', 'confirmed', 'cancelled']

const statusFilters: { value: string; labelKey: TKey }[] = [
  { value: 'all',       labelKey: 'ord_filter_all'       },
  { value: 'pending',   labelKey: 'ord_filter_pending'   },
  { value: 'confirmed', labelKey: 'ord_filter_confirmed' },
  { value: 'cancelled', labelKey: 'ord_filter_cancelled' },
]

const PAGE_SIZE = 10

function formatDateTime(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

function formatDateOnly(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const ORDERS_CACHE = (id: string) => `shipedo_seller_orders_v1_${id}`

function normalizeRows(data: any[]): OrderRow[] {
  const rows = (data || []) as OrderRow[]
  rows.forEach(o => {
    if ((!o.total_amount || o.total_amount === 0) && Array.isArray(o.items)) {
      const calc = o.items.reduce((s: number, it: any) => s + (Number(it.unit_price || it.price || 0) * (Number(it.quantity) || 1)), 0)
      if (calc > 0) o.total_amount = calc
    }
  })
  return rows
}

export default function SellerOrdersPage() {
  const router = useRouter()
  const { t } = useT()
  const [orders, setOrders]         = useState<OrderRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState<string>('all')
  const [page, setPage]             = useState(1)
  const [expandedDetails, setExpanded] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrderRow | null>(null)
  const [deleting, setDeleting]         = useState(false)

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

    const CACHE_KEY = ORDERS_CACHE(sellerId)

    // Show cached data instantly
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        setOrders(JSON.parse(cached))
        setLoading(false)
      }
    } catch {}

    // Fetch fresh in background
    supabase.from('orders')
      .select('id, tracking_number, seller_id, customer_name, customer_phone, customer_city, customer_address, country, items, total_amount, original_total, status, payment_method, source, subuser, created_at, call_attempts, reminded_at, cancel_reason')
      .eq('seller_id', sellerId)
      .in('status', CONFIRMATION_STATUSES)
      .order('created_at', { ascending: false })
      .limit(2000)
      .then(({ data }) => {
        const rows = normalizeRows(data || [])
        setOrders(rows)
        setLoading(false)
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(rows)) } catch {}
      })
  }, [])

  /* ── Filter ── */
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return orders.filter(o => {
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter
      if (!matchesStatus) return false
      if (!s) return true
      return (
        (o.tracking_number || '').toLowerCase().includes(s) ||
        (o.customer_name || '').toLowerCase().includes(s) ||
        (o.customer_phone || '').includes(s) ||
        (o.customer_city || '').toLowerCase().includes(s) ||
        (o.customer_address || '').toLowerCase().includes(s) ||
        String(o.total_amount || '').includes(s)
      )
    })
  }, [orders, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const startIdx   = (safePage - 1) * PAGE_SIZE
  const endIdx     = Math.min(startIdx + PAGE_SIZE, filtered.length)
  const pageRows   = filtered.slice(startIdx, endIdx)

  useEffect(() => { setPage(1) }, [search, statusFilter])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('orders').delete().eq('id', deleteTarget.id)
    setOrders(prev => {
      const updated = prev.filter(o => o.id !== deleteTarget.id)
      try {
        const stored = localStorage.getItem('shipedo_seller')
        if (stored) {
          const { id } = JSON.parse(stored)
          localStorage.setItem(ORDERS_CACHE(id), JSON.stringify(updated))
        }
      } catch {}
      return updated
    })
    setDeleteTarget(null)
    setDeleting(false)
  }

  const handleExport = () => {
    if (filtered.length === 0) { alert(t('ord_no_export')); return }
    const headers = ['ID','Source','Subuser','Customer','Phone','City','Items','Total','Status','Date']
    const rows = filtered.map(o => [
      o.tracking_number,
      o.source || 'Manual',
      o.subuser || '',
      o.customer_name,
      o.customer_phone,
      o.customer_city,
      Array.isArray(o.items) ? o.items.length : 0,
      o.total_amount,
      o.status,
      formatDateTime(o.created_at),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `orders-${formatDateOnly(new Date().toISOString())}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Header title={t('hdr_orders')} subtitle={`${orders.length} ${t('hdr_orders_sub')}`} role="seller" />

      <div className="px-6 pt-5 pb-8 space-y-5">

        {/* ── Page title ── */}
        <h1 className="text-xl font-bold text-[#f4991a]">{t('ord_title')}</h1>

        {/* ── Search bar ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
          <div className="relative flex-1">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('ord_search_placeholder')}
              className="w-full px-4 py-3 bg-transparent text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none"
            />
          </div>
          <button className="w-11 h-11 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all">
            <Search size={17} />
          </button>
          <button onClick={handleExport} className="w-11 h-11 rounded-xl bg-[#f4991a] hover:bg-orange-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/30 transition-all">
            <Download size={17} />
          </button>
        </div>

        {/* ── Status filter pills ── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                statusFilter === f.value
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-white border border-gray-100 text-gray-500 hover:border-gray-200'
              )}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>

        {/* ── Orders card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-[#f4991a]">{t('ord_title')}</h2>
              <div className="flex items-center gap-1 px-3 py-1.5 border border-orange-200 rounded-lg text-xs font-semibold text-[#f4991a] bg-orange-50/50">
                {filtered.length === 0 ? '0 / 0' : `${startIdx + 1} - ${endIdx} / ${filtered.length}`}
                <ChevronDown size={12} />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/seller/orders/new"
                className="flex items-center gap-1.5 px-4 py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-orange-500/20 transition-all"
              >
                <Plus size={14} /> {t('ord_new_order')}
              </Link>
              <Link
                href="/seller/orders/import"
                className="flex items-center gap-1.5 px-4 py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-orange-500/20 transition-all"
              >
                <Upload size={14} /> {t('ord_import')}
              </Link>
              <button
                onClick={handleExport}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm shadow-amber-400/20 transition-all"
              >
                <FileSpreadsheet size={14} /> {t('ord_excel')}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {([
                    { key: 'ord_id'          as TKey, center: false },
                    { key: 'ord_source'      as TKey, center: false },
                    { key: 'ord_subuser'     as TKey, center: false },
                    { key: 'ord_customer'    as TKey, center: false },
                    { key: 'ord_details'     as TKey, center: false },
                    { key: 'ord_total_price' as TKey, center: false },
                    { key: 'ord_order_date'  as TKey, center: false },
                    { key: 'ord_status'      as TKey, center: false },
                    { key: 'ord_actions'     as TKey, center: true  },
                  ]).map(h => (
                    <th
                      key={h.key}
                      className={cn(
                        'text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3.5 whitespace-nowrap',
                        h.center ? 'text-center' : 'text-left'
                      )}
                    >
                      {t(h.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="inline-flex flex-col items-center text-gray-300">
                        <div className="w-7 h-7 border-2 border-gray-200 border-t-[#f4991a] rounded-full animate-spin mb-2" />
                        <p className="text-xs">{t('loading_orders')}</p>
                      </div>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                          <Package size={22} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500">{t('ord_no_orders')}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {search || statusFilter !== 'all' ? t('ord_try_filters') : t('ord_create_first')}
                        </p>
                        {!search && statusFilter === 'all' && (
                          <Link href="/seller/orders/new" className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-lg">
                            <Plus size={13} /> {t('ord_new_order')}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map(order => {
                    const cfg     = statusConfig[order.status] || statusConfig.pending
                    const itemCount = Array.isArray(order.items) ? order.items.length : 0
                    const isExpanded = expandedDetails === order.id

                    return (
                      <Fragment key={order.id}>
                      <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-xs font-mono text-gray-700">{order.tracking_number}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs font-semibold text-gray-600">{order.source || 'Manual'}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-gray-400">{order.subuser || '—'}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs font-semibold text-gray-700">{order.customer_name || t('customer')}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{order.customer_phone}</div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => setExpanded(isExpanded ? null : order.id)}
                            className="flex items-center gap-2 group"
                          >
                            <div>
                              <div className="text-xs font-bold text-[#f4991a]">
                                {itemCount} <span className="font-semibold">{itemCount === 1 ? t('product') : t('products')}</span>
                              </div>
                              <div className="text-[11px] text-gray-400 mt-0.5">{formatDateOnly(order.created_at)}</div>
                            </div>
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-orange-50 group-hover:text-[#f4991a] transition-all">
                              <ChevronDown size={11} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          {(order.total_amount || 0) > 0 ? (
                            <>
                              <span className="text-sm font-bold text-gray-700">{order.total_amount.toLocaleString()}</span>
                              <span className="text-[10px] text-gray-400 font-semibold ml-1">KES</span>
                              {order.original_total && order.original_total !== order.total_amount && order.original_total > 0 && (
                                <span className="text-[9px] text-gray-400 line-through ml-1">KES {order.original_total.toLocaleString()}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(order.created_at)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-start gap-1.5">
                            <span className={cn(
                              'inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border-2 bg-white whitespace-nowrap',
                              cfg.color, cfg.border
                            )}>
                              {t(cfg.labelKey)}
                            </span>
                            {order.status === 'pending' && (order.call_attempts || 0) > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-semibold text-gray-600 whitespace-nowrap">
                                <Phone size={10} /> Unreached ({order.call_attempts})
                              </span>
                            )}
                            {order.status === 'pending' && order.reminded_at && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] font-semibold text-indigo-600 whitespace-nowrap">
                                <Clock size={10} /> Reminded (To: {formatDateTime(order.reminded_at)})
                              </span>
                            )}
                            {order.status === 'cancelled' && order.cancel_reason && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-[10px] font-semibold text-red-600 max-w-[180px] truncate" title={order.cancel_reason}>
                                {order.cancel_reason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {(() => {
                            const canAct = (order.call_attempts ?? 0) === 0
                            const blockedTitle = 'Agent already called this customer'
                            return (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => router.push(`/seller/orders/${order.id}`)}
                                  className="w-8 h-8 rounded-full border border-gray-200 hover:border-orange-300 hover:bg-orange-50 flex items-center justify-center text-gray-400 hover:text-[#f4991a] transition-all"
                                  title={t('view')}
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  onClick={() => canAct && router.push(`/seller/orders/${order.id}?edit=1`)}
                                  disabled={!canAct}
                                  className={cn(
                                    'w-8 h-8 rounded-full border flex items-center justify-center transition-all',
                                    canAct
                                      ? 'border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-400 hover:text-[#f4991a] cursor-pointer'
                                      : 'border-gray-100 bg-gray-50 text-gray-200 cursor-not-allowed'
                                  )}
                                  title={canAct ? t('edit') : blockedTitle}
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => canAct && setDeleteTarget(order)}
                                  disabled={!canAct}
                                  className={cn(
                                    'w-8 h-8 rounded-full border flex items-center justify-center transition-all',
                                    canAct
                                      ? 'border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer'
                                      : 'border-gray-100 bg-gray-50 text-gray-200 cursor-not-allowed'
                                  )}
                                  title={canAct ? 'Delete order' : blockedTitle}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )
                          })()}
                        </td>
                      </tr>
                      {isExpanded && Array.isArray(order.items) && order.items.length > 0 && (
                        <tr className="border-b border-gray-50 bg-orange-50/20">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="max-w-3xl">
                              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                                {t('products')} ({order.items.length})
                              </p>
                              <OrderItemsDetails items={order.items} />
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-50 flex-wrap">
              <span className="text-xs text-gray-400">
                {t('showing')} <span className="font-semibold text-gray-600">{startIdx + 1}–{endIdx}</span> {t('of')} <span className="font-semibold text-gray-600">{filtered.length}</span> {t('orders_lc')}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum = i + 1
                  if (totalPages > 5 && safePage > 3) {
                    pageNum = Math.min(safePage - 2 + i, totalPages)
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                        safePage === pageNum
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                          : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-800 text-center mb-1">Delete order?</h3>
            <p className="text-sm text-gray-500 text-center mb-1">
              <span className="font-semibold text-gray-700">{deleteTarget.tracking_number}</span>
            </p>
            <p className="text-xs text-gray-400 text-center mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-sm shadow-red-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
