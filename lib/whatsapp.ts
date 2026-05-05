const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || ''
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || ''
const GRAPH_API = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`

export function isWhatsAppConfigured(): boolean {
  return Boolean(WHATSAPP_TOKEN && WHATSAPP_PHONE_ID)
}

function formatPhone(phone: string): string {
  let num = (phone || '').replace(/[^\d]/g, '')
  if (/^0[17]\d{8}$/.test(num)) num = '254' + num.slice(1)
  return num
}

export async function sendWhatsAppText(phone: string, text: string): Promise<boolean> {
  if (!isWhatsAppConfigured()) return false

  const to = formatPhone(phone)
  if (!to) return false

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
      console.error('WhatsApp send error:', data)
      return false
    }
    return true
  } catch (err) {
    console.error('WhatsApp send failed:', err)
    return false
  }
}

export async function sendOrderConfirmationMessage(
  phone: string,
  customerName: string,
  trackingNumber: string,
  productList: string,
): Promise<boolean> {
  const text =
    `Hello ${customerName}, your order *${trackingNumber}* for ${productList} is received.\n\n` +
    `Reply *YES* to confirm or *NO* to cancel.`
  return sendWhatsAppText(phone, text)
}
