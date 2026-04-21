'use client'

type Item = {
  product_id?: string | null
  name?: string
  sku?: string
  quantity?: number
  unit_price?: number
  price?: number
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
        <div key={i} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-100 rounded-xl">
          <span className="text-xs font-semibold text-gray-700">
            {it.name || it.sku || 'Item'}
          </span>
          <span className="text-xs font-bold text-[#f4991a] ml-4 flex-shrink-0">
            ×{it.quantity || 1}
          </span>
        </div>
      ))}
    </div>
  )
}
