import { supabase } from './supabase'

/**
 * Increment a product's stock columns when an expedition is received.
 * Matches by sku + seller_id (sku is unique within a seller).
 */
export async function receiveStock(opts: {
  sellerId: string
  sku: string
  received: number
  defective: number
}) {
  const { sellerId, sku, received, defective } = opts
  if (!sellerId || !sku) return
  const { data: rows } = await supabase
    .from('products')
    .select('id, stock, total_quantity, defective_quantity')
    .eq('seller_id', sellerId)
    .eq('sku', sku)
    .limit(1)
  const row = rows?.[0]
  if (!row) return
  await supabase
    .from('products')
    .update({
      stock: (row.stock || 0) + received,
      total_quantity: (row.total_quantity || 0) + received,
      defective_quantity: (row.defective_quantity || 0) + defective,
    })
    .eq('id', row.id)
}

/**
 * Decrement quantity_in_stock for each item in a confirmed order.
 * Called when agent confirms a call.
 */
export async function decrementStockForOrderItems(items: any[]) {
  if (!Array.isArray(items)) return
  for (const it of items) {
    const pid = it?.product_id
    const qty = Number(it?.quantity) || 0
    if (!pid || qty <= 0) continue
    const { data: rows } = await supabase
      .from('products')
      .select('id, stock')
      .eq('id', pid)
      .limit(1)
    const row = rows?.[0]
    if (!row) continue
    await supabase
      .from('products')
      .update({ stock: Math.max(0, (row.stock || 0) - qty) })
      .eq('id', row.id)
  }
}

/**
 * Increment stock back when an order is returned.
 * Reverses the decrement done at confirmation.
 */
export async function incrementStockForOrderItems(items: any[]) {
  if (!Array.isArray(items)) return
  for (const it of items) {
    const pid = it?.product_id
    const qty = Number(it?.quantity) || 0
    if (!pid || qty <= 0) continue
    const { data: rows } = await supabase
      .from('products')
      .select('id, stock')
      .eq('id', pid)
      .limit(1)
    const row = rows?.[0]
    if (!row) continue
    await supabase
      .from('products')
      .update({ stock: (row.stock || 0) + qty })
      .eq('id', row.id)
  }
}

/**
 * Decrement total_quantity for each item when an order is delivered/paid.
 */
export async function decrementTotalQuantityForOrderItems(items: any[]) {
  if (!Array.isArray(items)) return
  for (const it of items) {
    const pid = it?.product_id
    const qty = Number(it?.quantity) || 0
    if (!pid || qty <= 0) continue
    const { data: rows } = await supabase
      .from('products')
      .select('id, total_quantity')
      .eq('id', pid)
      .limit(1)
    const row = rows?.[0]
    if (!row) continue
    await supabase
      .from('products')
      .update({ total_quantity: Math.max(0, (row.total_quantity || 0) - qty) })
      .eq('id', row.id)
  }
}
