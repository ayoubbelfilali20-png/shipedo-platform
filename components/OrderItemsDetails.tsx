'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, ExternalLink, User, Hash, Tag, Warehouse } from 'lucide-react'

type Item = {
  product_id?: string | null
  name?: string
  sku?: string
  quantity?: number
  unit_price?: number
  price?: number
}

type ProductDetail = {
  id: string
  name: string
  sku: string
  image_url: string | null
  description: string | null
  product_link: string | null
  product_video_link: string | null
  selling_price: number | null
  code: string | null
  variant_code: string | null
  origin: string | null
  seller_id: string | null
}

export default function OrderItemsDetails({
  items,
  showSeller = false,
  compact = false,
}: {
  items: Item[]
  showSeller?: boolean
  compact?: boolean
}) {
  const [products, setProducts] = useState<Record<string, ProductDetail>>({})
  const [sellers, setSellers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ids = items.map(i => i.product_id).filter(Boolean) as string[]
    const skus = items.map(i => i.sku).filter(Boolean) as string[]
    if (ids.length === 0 && skus.length === 0) { setLoading(false); return }

    ;(async () => {
      let query = supabase.from('products').select('*')
      if (ids.length > 0 && skus.length > 0) {
        query = query.or(`id.in.(${ids.join(',')}),sku.in.(${skus.map(s => `"${s}"`).join(',')})`)
      } else if (ids.length > 0) {
        query = query.in('id', ids)
      } else {
        query = query.in('sku', skus)
      }
      const { data } = await query
      const map: Record<string, ProductDetail> = {}
      ;(data || []).forEach((p: any) => {
        map[p.id] = p
        if (p.sku) map[`sku:${p.sku}`] = p
      })
      setProducts(map)

      if (showSeller) {
        const sellerIds = Array.from(new Set((data || []).map((p: any) => p.seller_id).filter(Boolean)))
        if (sellerIds.length > 0) {
          const { data: sData } = await supabase
            .from('sellers')
            .select('id, name')
            .in('id', sellerIds)
          const sMap: Record<string, string> = {}
          ;(sData || []).forEach((s: any) => { sMap[s.id] = s.name })
          setSellers(sMap)
        }
      }
      setLoading(false)
    })()
  }, [JSON.stringify(items.map(i => i.product_id || i.sku)), showSeller])

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block w-4 h-4 border-2 border-gray-200 border-t-[#f4991a] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const p =
          (it.product_id && products[it.product_id]) ||
          (it.sku && products[`sku:${it.sku}`]) ||
          null
        const unit = it.unit_price ?? it.price ?? p?.selling_price ?? 0
        const qty = it.quantity || 1
        const sellerName = p?.seller_id ? sellers[p.seller_id] : null

        return (
          <div
            key={i}
            className="flex gap-3 bg-white border border-gray-200 rounded-xl p-3 hover:border-[#f4991a]/40 transition-all"
          >
            {/* Image */}
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-orange-50 to-blue-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {p?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <Package size={26} className="text-gray-300" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-[#1a1c3a] truncate">
                  {p?.name || it.name || 'Item'}
                </p>
                <span className="text-xs font-bold text-[#f4991a] flex-shrink-0">
                  ×{qty}
                </span>
              </div>

              {p?.description && !compact && (
                <p className="text-[11px] text-gray-500 line-clamp-2">{p.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500 pt-1">
                {(it.sku || p?.sku) && (
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Hash size={10} className="text-gray-400" /> {it.sku || p?.sku}
                  </span>
                )}
                {(p?.code || p?.origin) && (
                  <span className="inline-flex items-center gap-1">
                    <Warehouse size={10} className="text-gray-400" /> {p?.code || p?.origin}
                  </span>
                )}
                {p?.variant_code && (
                  <span className="inline-flex items-center gap-1">
                    <Tag size={10} className="text-gray-400" /> {p.variant_code}
                  </span>
                )}
                {showSeller && sellerName && (
                  <span className="inline-flex items-center gap-1">
                    <User size={10} className="text-gray-400" /> {sellerName}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-emerald-600">
                  KES {(unit * qty).toLocaleString()}
                </span>
                {p?.product_link && (
                  <a
                    href={p.product_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700"
                  >
                    Product link <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
