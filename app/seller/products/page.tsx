'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { ProductStatus } from '@/lib/types'
import {
  Search, Plus, Package, FileSpreadsheet, AlertCircle,
  ChevronLeft, ChevronRight, ChevronDown, Maximize2, Home
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useT, type TKey } from '@/lib/i18n'

const statusFilters: { value: ProductStatus | 'all'; labelKey: TKey }[] = [
  { value: 'all',          labelKey: 'prod_filter_all'      },
  { value: 'active',       labelKey: 'prod_filter_active'   },
  { value: 'low_stock',    labelKey: 'prod_filter_low'      },
  { value: 'out_of_stock', labelKey: 'prod_filter_out'      },
  { value: 'inactive',     labelKey: 'prod_filter_inactive' },
]

const PAGE_SIZE = 10

function shortId(id: string, sku?: string) {
  if (sku) return sku
  if (!id) return 'COD00000'
  const digits = id.replace(/\D/g, '').slice(0, 5).padStart(5, '0')
  return `COD${digits}`
}

export default function SellerProductsPage() {
  const router = useRouter()
  const { t } = useT()
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState<ProductStatus | 'all'>('all')
  const [products, setProducts]           = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [page, setPage]                   = useState(1)

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
    supabase.from('products').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false }).then(({ data }) => {
      setProducts(data || [])
      setLoading(false)
    })
  }, [])

  /* ── Filter ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter(p => {
      const matchStatus = statusFilter === 'all' || p.status === statusFilter
      if (!matchStatus) return false
      if (!q) return true
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      )
    })
  }, [products, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const startIdx   = (safePage - 1) * PAGE_SIZE
  const endIdx     = Math.min(startIdx + PAGE_SIZE, filtered.length)
  const pageRows   = filtered.slice(startIdx, endIdx)

  useEffect(() => { setPage(1) }, [search, statusFilter])

  const handleExport = () => {
    if (filtered.length === 0) return
    const headers = ['ID', 'Name', 'SKU', 'Category', 'Stock', 'Selling Price', 'Buying Price', 'Status']
    const rows = filtered.map(p => [
      shortId(p.id, p.sku),
      p.name,
      p.sku,
      p.category,
      p.stock || 0,
      p.selling_price || 0,
      p.buying_price || 0,
      p.status,
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Header title={t('prod_title')} subtitle={`${products.length} ${t('prod_subtitle')}`} role="seller" />

      <div className="px-6 pt-5 pb-8 space-y-5">

        {/* ── Page title ── */}
        <h1 className="text-xl font-bold text-[#f4991a]">{t('prod_title')}</h1>

        {/* ── Search bar ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
          <div className="relative flex-1">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('prod_search_placeholder')}
              className="w-full px-4 py-3 bg-transparent text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none"
            />
          </div>
          <button className="w-11 h-11 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all">
            <Search size={17} />
          </button>
          <button onClick={handleExport} className="w-11 h-11 rounded-xl bg-[#f4991a] hover:bg-orange-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/30 transition-all">
            <FileSpreadsheet size={17} />
          </button>
        </div>

        {/* ── Status filter pills ── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
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

        {/* ── Products card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-[#f4991a]">{t('prod_title')}</h2>
              <div className="flex items-center gap-1 px-3 py-1.5 border border-orange-200 rounded-lg text-xs font-semibold text-[#f4991a] bg-orange-50/50">
                {filtered.length === 0 ? '0 / 0' : `${startIdx + 1} - ${endIdx} / ${filtered.length}`}
                <ChevronDown size={12} />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/seller/products/new"
                className="flex items-center gap-1.5 px-4 py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-orange-500/20 transition-all"
              >
                <Plus size={14} /> {t('prod_new')}
              </Link>
              <button
                onClick={handleExport}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm shadow-amber-400/20 transition-all"
              >
                <FileSpreadsheet size={14} /> {t('prod_excel')}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {([
                    'prod_id', 'prod_name', 'prod_qty_in_stock', 'prod_total_qty',
                    'prod_qty_defective', 'prod_price', 'prod_discount_price',
                    'prod_upsell', 'prod_crosssell',
                  ] as TKey[]).map(k => (
                    <th
                      key={k}
                      className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3.5 whitespace-nowrap text-left"
                    >
                      {t(k)}
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
                        <p className="text-xs">{t('prod_loading')}</p>
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
                        <p className="text-sm font-semibold text-gray-500">{t('prod_no_products')}</p>
                        <p className="text-xs text-gray-400 mt-1">{t('prod_create_first')}</p>
                        <Link href="/seller/products/new" className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-lg">
                          <Plus size={13} /> {t('prod_new')}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map(p => {
                    const stockQty   = p.stock || 0
                    const totalQty   = p.total_quantity ?? stockQty
                    const defective  = p.defective_quantity ?? 0
                    const sellingPrc = p.selling_price || 0
                    const discount   = p.discount_price ?? null
                    const code       = shortId(p.id, p.sku)

                    return (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        {/* ID */}
                        <td className="px-4 py-4">
                          <span className="text-xs font-mono font-semibold text-gray-700">{code}</span>
                        </td>

                        {/* Name */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-blue-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {p.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={18} className="text-gray-300" />
                              )}
                              <button
                                onClick={() => router.push(`/seller/products/${p.id}`)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center text-emerald-600 transition-all"
                                title={t('view')}
                              >
                                <Maximize2 size={9} />
                              </button>
                            </div>
                            <span className="text-xs font-bold text-[#1a1c3a] max-w-[180px] truncate">{p.name}</span>
                          </div>
                        </td>

                        {/* Quantity In Stock */}
                        <td className="px-4 py-4">
                          <div className="inline-flex flex-col items-start">
                            <span className="inline-block bg-orange-100 text-orange-700 text-[11px] font-bold px-3 py-0.5 rounded-full mb-1.5">
                              {t('prod_total')}: {stockQty}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Home size={12} className="text-gray-400" />
                              <span className="text-base leading-none">🇰🇪</span>
                              <span className="font-semibold">{stockQty}</span>
                            </div>
                          </div>
                        </td>

                        {/* Total Quantity */}
                        <td className="px-4 py-4">
                          <div className="inline-flex flex-col items-start">
                            <span className="inline-block bg-orange-100 text-orange-700 text-[11px] font-bold px-3 py-0.5 rounded-full mb-1.5">
                              {t('prod_total')}: {totalQty}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Home size={12} className="text-gray-400" />
                              <span className="text-base leading-none">🇰🇪</span>
                              <span className="font-semibold">{totalQty}</span>
                            </div>
                          </div>
                        </td>

                        {/* Quantity Defective */}
                        <td className="px-4 py-4">
                          <div className="inline-flex flex-col items-start">
                            <span className="inline-block bg-orange-100 text-orange-700 text-[11px] font-bold px-3 py-0.5 rounded-full mb-1.5">
                              {t('prod_total')}: {defective}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Home size={12} className="text-gray-400" />
                              <span className="text-base leading-none">🇰🇪</span>
                              <span className="font-semibold">{defective}</span>
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-rose-500">{sellingPrc.toLocaleString()}</span>
                          <span className="text-[10px] text-gray-400 font-semibold ml-1">KES</span>
                        </td>

                        {/* Discount Price */}
                        <td className="px-4 py-4">
                          {discount !== null && discount > 0 ? (
                            <>
                              <span className="text-sm font-bold text-gray-700">{Number(discount).toLocaleString()}</span>
                              <span className="text-[10px] text-gray-400 font-semibold ml-1">KES</span>
                            </>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Up-sell */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-rose-500 bg-rose-50 border border-rose-200">
                            <AlertCircle size={12} /> {t('prod_not_used')}
                          </span>
                        </td>

                        {/* Cross-sell */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-orange-500 bg-orange-50 border border-orange-200">
                            <AlertCircle size={12} /> {t('prod_not_used')}
                          </span>
                        </td>
                      </tr>
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
                {t('showing')} <span className="font-semibold text-gray-600">{startIdx + 1}–{endIdx}</span> {t('of')} <span className="font-semibold text-gray-600">{filtered.length}</span> {t('prod_title').toLowerCase()}
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
    </div>
  )
}
