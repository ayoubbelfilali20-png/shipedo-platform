import { supabase } from './supabase'
import { Expedition, ExpeditionStatus, ExpeditionOrigin } from './types'

function rowToExpedition(r: any): Expedition {
  return {
    id: r.id,
    reference: r.reference,
    origin: r.origin as ExpeditionOrigin,
    originCity: r.origin_city,
    destination: r.destination,
    status: r.status as ExpeditionStatus,
    products: Array.isArray(r.products) ? r.products : [],
    totalItems: r.total_items || 0,
    totalCost: Number(r.total_cost) || 0,
    shippingCost: Number(r.shipping_cost) || 0,
    customsFee: Number(r.customs_fee) || 0,
    estimatedArrival: r.estimated_arrival || '',
    actualArrival: r.actual_arrival || undefined,
    trackingNumber: r.tracking_number || '',
    carrier: r.carrier || '',
    notes: r.notes || '',
    createdBy: r.created_by || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function fetchExpeditions(opts?: { sellerId?: string }): Promise<Expedition[]> {
  let q = supabase.from('expeditions').select('*').order('created_at', { ascending: false })
  if (opts?.sellerId) q = q.eq('created_by', opts.sellerId)
  const { data } = await q
  return (data || []).map(rowToExpedition)
}

export async function addExpedition(exp: Expedition): Promise<Expedition | null> {
  const { data } = await supabase
    .from('expeditions')
    .insert({
      reference: exp.reference,
      origin: exp.origin,
      origin_city: exp.originCity,
      destination: exp.destination,
      status: exp.status,
      products: exp.products,
      total_items: exp.totalItems,
      total_cost: exp.totalCost,
      shipping_cost: exp.shippingCost,
      customs_fee: exp.customsFee,
      estimated_arrival: exp.estimatedArrival || null,
      tracking_number: exp.trackingNumber || null,
      carrier: exp.carrier || null,
      notes: exp.notes || null,
      created_by: exp.createdBy || null,
    })
    .select('*')
    .single()
  return data ? rowToExpedition(data) : null
}

export async function updateExpeditionStatus(id: string, status: ExpeditionStatus) {
  await supabase
    .from('expeditions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
}
