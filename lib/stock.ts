import { supabase } from './supabase'

/**
 * Increment a product's stock when an expedition is received (per-country).
 */
export async function receiveStock(opts: {
  sellerId: string
  sku: string
  received: number
  defective: number
  country?: string
}) {
  const { sellerId, sku, received, defective, country = 'KE' } = opts
  if (!sellerId || !sku) return

  const { data: rows } = await supabase
    .from('products')
    .select('id')
    .eq('seller_id', sellerId)
    .eq('sku', sku)
    .limit(1)
  const product = rows?.[0]
  if (!product) return

  const { data: stockRow } = await supabase
    .from('product_stock')
    .select('id, stock, total_quantity, defective_quantity')
    .eq('product_id', product.id)
    .eq('country', country)
    .maybeSingle()

  if (stockRow) {
    await supabase
      .from('product_stock')
      .update({
        stock: (stockRow.stock || 0) + received,
        total_quantity: (stockRow.total_quantity || 0) + received,
        defective_quantity: (stockRow.defective_quantity || 0) + defective,
      })
      .eq('id', stockRow.id)
  } else {
    await supabase
      .from('product_stock')
      .insert({
        product_id: product.id,
        country,
        stock: received,
        total_quantity: received,
        defective_quantity: defective,
      })
  }
}

/**
 * Decrement stock for each item in a confirmed order (per-country).
 */
export async function decrementStockForOrderItems(items: any[], country = 'KE') {
  if (!Array.isArray(items)) return
  for (const it of items) {
    const pid = it?.product_id
    const qty = Number(it?.quantity) || 0
    if (!pid || qty <= 0) continue
    const { data: row } = await supabase
      .from('product_stock')
      .select('id, stock')
      .eq('product_id', pid)
      .eq('country', country)
      .maybeSingle()
    if (!row) continue
    await supabase
      .from('product_stock')
      .update({ stock: Math.max(0, (row.stock || 0) - qty) })
      .eq('id', row.id)
  }
}

/**
 * Increment stock back when an order is returned (per-country).
 */
export async function incrementStockForOrderItems(items: any[], country = 'KE') {
  if (!Array.isArray(items)) return
  for (const it of items) {
    const pid = it?.product_id
    const qty = Number(it?.quantity) || 0
    if (!pid || qty <= 0) continue
    const { data: row } = await supabase
      .from('product_stock')
      .select('id, stock')
      .eq('product_id', pid)
      .eq('country', country)
      .maybeSingle()
    if (!row) continue
    await supabase
      .from('product_stock')
      .update({ stock: (row.stock || 0) + qty })
      .eq('id', row.id)
  }
}

/**
 * Decrement total_quantity for each item when delivered/paid (per-country).
 */
export async function decrementTotalQuantityForOrderItems(items: any[], country = 'KE') {
  if (!Array.isArray(items)) return
  for (const it of items) {
    const pid = it?.product_id
    const qty = Number(it?.quantity) || 0
    if (!pid || qty <= 0) continue
    const { data: row } = await supabase
      .from('product_stock')
      .select('id, total_quantity')
      .eq('product_id', pid)
      .eq('country', country)
      .maybeSingle()
    if (!row) continue
    await supabase
      .from('product_stock')
      .update({ total_quantity: Math.max(0, (row.total_quantity || 0) - qty) })
      .eq('id', row.id)
  }
}

/**
 * Get stock for a product in a specific country.
 */
export async function getProductStock(productId: string, country = 'KE') {
  const { data } = await supabase
    .from('product_stock')
    .select('stock, total_quantity, defective_quantity')
    .eq('product_id', productId)
    .eq('country', country)
    .maybeSingle()
  return data || { stock: 0, total_quantity: 0, defective_quantity: 0 }
}
