import { NextRequest, NextResponse } from 'next/server'
import { sendOrderConfirmationMessage, isWhatsAppConfigured } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ ok: false, error: 'WhatsApp not configured' }, { status: 400 })
  }

  const { phone, customerName, trackingNumber, productList } = await req.json()

  if (!phone || !customerName || !trackingNumber) {
    return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
  }

  const sent = await sendOrderConfirmationMessage(phone, customerName, trackingNumber, productList || 'your items')
  return NextResponse.json({ ok: sent })
}
