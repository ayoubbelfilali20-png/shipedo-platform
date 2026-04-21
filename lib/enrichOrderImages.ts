import { SupabaseClient } from '@supabase/supabase-js'

export async function enrichOrderImages(orders: any[], supabase: SupabaseClient) {
  const productIds = new Set<string>()
  orders.forEach(o => {
    if (Array.isArray(o.items)) {
      o.items.forEach((it: any) => {
        if (it.product_id) productIds.add(it.product_id)
      })
    }
  })
  if (productIds.size === 0) return orders

  const { data: products } = await supabase
    .from('products')
    .select('id, image_url')
    .in('id', [...productIds])

  if (!products || products.length === 0) return orders

  const imgMap = new Map(products.map(p => [p.id, p.image_url]))

  orders.forEach(o => {
    if (Array.isArray(o.items)) {
      o.items = o.items.map((it: any) =>
        it.product_id && imgMap.has(it.product_id)
          ? { ...it, image_url: imgMap.get(it.product_id) }
          : it
      )
    }
  })

  return orders
}
