import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getCountryFromRequest } from '@/lib/countryFilter'

const COLS_FULL = 'id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, printed, print_count, notes, last_call_note, shipped_at, shipped_to_agent_at, delivered_at, returned_at, last_call_at, created_at, seller_id, call_attempts, reminded_at, cancel_reason, assigned_agent_id, delivery_tracking, status_changed_at, country'

const COLS_SAFE = 'id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, printed, print_count, notes, last_call_note, shipped_at, shipped_to_agent_at, delivered_at, returned_at, last_call_at, created_at, seller_id, call_attempts, reminded_at, cancel_reason, assigned_agent_id, delivery_tracking, country'

const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
const pages = [0, 1, 2, 3, 4]

async function fetchAll(cols: string, country: string | null, orFilter?: string) {
  const results = await Promise.all(
    pages.map(p => {
      let q = supabaseAdmin.from('orders').select(cols)
      if (country) q = q.eq('country', country)
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
  const country = getCountryFromRequest(req)

  if (all) {
    let { orders, hasError } = await fetchAll(COLS_FULL, country)
    if (hasError && orders.length === 0) {
      const fallback = await fetchAll(COLS_SAFE, country)
      orders = fallback.orders
    }
    return NextResponse.json({ orders }, { headers })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffIso = cutoff.toISOString()

  const orFilterFull = `created_at.gte.${cutoffIso},last_call_at.gte.${cutoffIso},shipped_at.gte.${cutoffIso},shipped_to_agent_at.gte.${cutoffIso},delivered_at.gte.${cutoffIso},returned_at.gte.${cutoffIso},status_changed_at.gte.${cutoffIso}`
  const orFilterSafe = `created_at.gte.${cutoffIso},last_call_at.gte.${cutoffIso},shipped_at.gte.${cutoffIso},shipped_to_agent_at.gte.${cutoffIso},delivered_at.gte.${cutoffIso},returned_at.gte.${cutoffIso}`

  let { orders, hasError } = await fetchAll(COLS_FULL, country, orFilterFull)
  if (hasError && orders.length === 0) {
    const fallback = await fetchAll(COLS_SAFE, country, orFilterSafe)
    orders = fallback.orders
  }

  return NextResponse.json({ orders }, { headers })
}
