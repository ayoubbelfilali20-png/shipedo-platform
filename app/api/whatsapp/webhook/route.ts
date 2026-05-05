import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || ''

// GET — Meta webhook verification (hub.challenge handshake)
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — Incoming messages from customers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const entries = body?.entry || []
    for (const entry of entries) {
      const changes = entry?.changes || []
      for (const change of changes) {
        const messages = change?.value?.messages || []
        for (const msg of messages) {
          if (msg.type !== 'text') continue

          const from = msg.from // phone number e.g. "254712345678"
          const text = (msg.text?.body || '').trim().toUpperCase()

          if (text !== 'YES' && text !== 'NO') continue

          // Find the most recent pending order for this phone number
          const normalizedPhone = normalizePhone(from)
          const { data: orders } = await supabaseAdmin
            .from('orders')
            .select('id, status, customer_phone, customer_name, items')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(50)

          const order = orders?.find(o => normalizePhone(o.customer_phone) === normalizedPhone)

          if (!order) continue

          const newStatus = text === 'YES' ? 'confirmed' : 'cancelled'
          const patch: any = {
            status: newStatus,
            last_call_note: `Customer replied "${text}" via WhatsApp`,
            last_call_at: new Date().toISOString(),
          }
          if (newStatus === 'cancelled') {
            patch.cancel_reason = 'Customer replied NO via WhatsApp'
          }

          await supabaseAdmin.from('orders').update(patch).eq('id', order.id)

          await supabaseAdmin.from('call_logs').insert({
            order_id: order.id,
            agent_id: 'whatsapp-bot',
            agent_name: 'WhatsApp Bot',
            action: newStatus,
            note: `Customer replied "${text}" via WhatsApp`,
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('WhatsApp webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}

function normalizePhone(phone: string): string {
  let num = (phone || '').replace(/[^\d]/g, '')
  if (/^0[17]\d{8}$/.test(num)) num = '254' + num.slice(1)
  return num
}
