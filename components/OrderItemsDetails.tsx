'use client'

import { Package } from 'lucide-react'

type Item = {
  product_id?: string | null
  name?: string
  sku?: string
  quantity?: number
  unit_price?: number
  price?: number
  image_url?: string | null
}

export default function OrderItemsDetails({
  items,
}: {
  items: Item[]
  showSeller?: boolean
  compact?: boolean
}) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-100 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {it.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.image_url} alt={it.name || ''} className="w-full h-full object-cover" />
            ) : (
              <Package size={16} className="text-gray-300" />
            )}
          </div>
          <span className="text-xs font-semibold text-gray-700 flex-1 min-w-0 truncate">
            {it.name || it.sku || 'Item'}
          </span>
          <span className="text-xs font-bold text-[#f4991a] flex-shrink-0">
            ×{it.quantity || 1}
          </span>
        </div>
      ))}
    </div>
  )
}
