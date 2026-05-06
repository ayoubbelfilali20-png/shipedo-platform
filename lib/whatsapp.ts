import { supabaseAdmin } from '@/lib/supabaseAdmin'

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || ''
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || ''
const GRAPH_API = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`

export function isWhatsAppConfigured(): boolean {
  return Boolean(WHATSAPP_TOKEN && WHATSAPP_PHONE_ID)
}

export function formatPhone(phone: string): string {
  let num = (phone || '').replace(/[^\d]/g, '')
  if (/^0[17]\d{8}$/.test(num)) num = '254' + num.slice(1)
  return num
}

type SendOpts = { orderId?: string; agentId?: string; agentName?: string }

async function storeMessage(phone: string, body: string, waMessageId: string | null, opts?: SendOpts) {
  await supabaseAdmin.from('whatsapp_messages').insert({
    order_id: opts?.orderId || null,
    phone,
    direction: 'outgoing',
    body,
    agent_id: opts?.agentId || 'system',
    agent_name: opts?.agentName || 'System',
    wa_message_id: waMessageId,
  })
}

export async function sendWhatsAppText(phone: string, text: string, opts?: SendOpts): Promise<{ ok: boolean; error?: string }> {
  if (!isWhatsAppConfigured()) return { ok: false, error: 'WhatsApp not configured — add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID env vars' }

  const to = formatPhone(phone)
  if (!to) return { ok: false, error: 'Invalid phone number' }

  try {
    const res = await fetch(GRAPH_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      const errMsg = data?.error?.message || data?.error?.error_data?.details || JSON.stringify(data?.error || data)
      console.error('WhatsApp send error:', errMsg)
      return { ok: false, error: errMsg }
    }

    await storeMessage(to, text, data?.messages?.[0]?.id || null, opts)
    return { ok: true }
  } catch (err: any) {
    console.error('WhatsApp send failed:', err)
    return { ok: false, error: err.message || 'Network error' }
  }
}

export async function sendWhatsAppImage(phone: string, imageUrl: string, caption: string, opts?: SendOpts): Promise<{ ok: boolean; error?: string }> {
  if (!isWhatsAppConfigured()) return { ok: false, error: 'WhatsApp not configured — add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID env vars' }

  const to = formatPhone(phone)
  if (!to) return { ok: false, error: 'Invalid phone number' }

  try {
    const res = await fetch(GRAPH_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'image',
        image: { link: imageUrl, caption: caption || undefined },
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      const errMsg = data?.error?.message || data?.error?.error_data?.details || JSON.stringify(data?.error || data)
      console.error('WhatsApp image error:', errMsg)
      return { ok: false, error: errMsg }
    }

    const displayText = caption ? `[Image] ${caption}` : '[Image]'
    await storeMessage(to, displayText, data?.messages?.[0]?.id || null, opts)
    return { ok: true }
  } catch (err: any) {
    console.error('WhatsApp image failed:', err)
    return { ok: false, error: err.message || 'Network error' }
  }
}

export async function sendOrderConfirmationMessage(
  phone: string,
  customerName: string,
  trackingNumber: string,
  productList: string,
  orderId?: string,
): Promise<{ ok: boolean; error?: string }> {
  const text =
    `Hello ${customerName}, your order *${trackingNumber}* for ${productList} is received.\n\n` +
    `Reply *YES* to confirm or *NO* to cancel.`
  return sendWhatsAppText(phone, text, { orderId, agentId: 'system', agentName: 'System' })
}
