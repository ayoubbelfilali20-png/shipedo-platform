import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppText, isWhatsAppConfigured } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ ok: false, error: 'WhatsApp not configured' }, { status: 400 })
  }

  const { phone, text, orderId, agentId, agentName } = await req.json()

  if (!phone || !text) {
    return NextResponse.json({ ok: false, error: 'Missing phone or text' }, { status: 400 })
  }

  const sent = await sendWhatsAppText(phone, text, { orderId, agentId, agentName })
  return NextResponse.json({ ok: sent })
}
