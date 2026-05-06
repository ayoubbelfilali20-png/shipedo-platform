import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppText, sendWhatsAppImage, isWhatsAppConfigured } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ ok: false, error: 'WhatsApp not configured — add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID' }, { status: 400 })
  }

  const body = await req.json()
  const { phone, text, imageUrl, caption, orderId, agentId, agentName } = body

  if (!phone) {
    return NextResponse.json({ ok: false, error: 'Missing phone' }, { status: 400 })
  }

  const opts = { orderId, agentId, agentName }

  if (imageUrl) {
    const result = await sendWhatsAppImage(phone, imageUrl, caption || '', opts)
    return NextResponse.json(result)
  }

  if (!text) {
    return NextResponse.json({ ok: false, error: 'Missing text' }, { status: 400 })
  }

  const result = await sendWhatsAppText(phone, text, opts)
  return NextResponse.json(result)
}
