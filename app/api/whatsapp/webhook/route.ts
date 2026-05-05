import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { formatPhone } from '@/lib/whatsapp'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || ''

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

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

          const from = msg.from
          const text = (msg.text?.body || '').trim()
          const textUpper = text.toUpperCase()
          const normalizedPhone = formatPhone(from)

          // Find the most recent pending order for this phone
          const { data: orders } = await supabaseAdmin
            .from('orders')
            .select('id, status, customer_phone')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(50)

          const order = orders?.find(o => formatPhone(o.customer_phone) === normalizedPhone)

          // Store incoming message
          await supabaseAdmin.from('whatsapp_messages').insert({
            order_id: order?.id || null,
            phone: normalizedPhone,
            direction: 'incoming',
            body: text,
            agent_id: null,
            agent_name: null,
            wa_message_id: msg.id || null,
          })

          // Auto-confirm/cancel only on YES/NO
          if (order && (textUpper === 'YES' || textUpper === 'NO')) {
            const newStatus = textUpper === 'YES' ? 'confirmed' : 'cancelled'
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
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('WhatsApp webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}
