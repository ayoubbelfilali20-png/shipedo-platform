import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('warranty_invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  return NextResponse.json({ invoices: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { count } = await supabaseAdmin
    .from('warranty_invoices')
    .select('id', { count: 'exact', head: true })
  const num = (count || 0) + 1
  const invoiceNumber = `WRN-${String(num).padStart(5, '0')}`

  const { data, error } = await supabaseAdmin
    .from('warranty_invoices')
    .insert({
      invoice_number: invoiceNumber,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone || null,
      product_name: body.product_name,
      product_price: body.product_price || 0,
      warranty_text: body.warranty_text,
      invoice_date: body.invoice_date || new Date().toISOString(),
      warranty_start: body.warranty_start || new Date().toISOString(),
      warranty_end: body.warranty_end || new Date(Date.now() + 365 * 86400000).toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, invoice: data })
}
