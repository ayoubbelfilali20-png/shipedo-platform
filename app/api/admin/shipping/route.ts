import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const COLS_FULL = 'id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, printed, print_count, notes, last_call_note, shipped_at, shipped_to_agent_at, delivered_at, returned_at, last_call_at, created_at, seller_id, call_attempts, reminded_at, cancel_reason, assigned_agent_id, delivery_tracking, status_changed_at'

const COLS_SAFE = 'id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, printed, print_count, notes, last_call_note, shipped_at, shipped_to_agent_at, delivered_at, returned_at, last_call_at, created_at, seller_id, call_attempts, reminded_at, cancel_reason, assigned_agent_id, delivery_tracking'

const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
const pages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

async function fetchAll(cols: string, orFilter?: string) {
  const results = await Promise.all(
    pages.map(p => {
      let q = supabaseAdmin.from('orders').select(cols)
      if (orFilter) q = q.or(orFilter)
      return q.order('created_at', { ascending: false }).range(p * 1000, (p + 1) * 1000 - 1)
    })
  )
  const hasError = results.some(r => r.error)
  const orders = results.flatMap(r => r.data || [])
  return { orders, hasError }
}

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === '1'
  const days = Number(req.nextUrl.searchParams.get('days')) || 30

  if (all) {
    let { orders, hasError } = await fetchAll(COLS_FULL)
    if (hasError && orders.length === 0) {
      const fallback = await fetchAll(COLS_SAFE)
      orders = fallback.orders
    }
    return NextResponse.json({ orders }, { headers })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffIso = cutoff.toISOString()

  const orFilterFull = `created_at.gte.${cutoffIso},last_call_at.gte.${cutoffIso},shipped_at.gte.${cutoffIso},shipped_to_agent_at.gte.${cutoffIso},delivered_at.gte.${cutoffIso},returned_at.gte.${cutoffIso},status_changed_at.gte.${cutoffIso}`
  const orFilterSafe = `created_at.gte.${cutoffIso},last_call_at.gte.${cutoffIso},shipped_at.gte.${cutoffIso},shipped_to_agent_at.gte.${cutoffIso},delivered_at.gte.${cutoffIso},returned_at.gte.${cutoffIso}`

  let { orders, hasError } = await fetchAll(COLS_FULL, orFilterFull)
  if (hasError && orders.length === 0) {
    const fallback = await fetchAll(COLS_SAFE, orFilterSafe)
    orders = fallback.orders
  }

  return NextResponse.json({ orders }, { headers })
}
