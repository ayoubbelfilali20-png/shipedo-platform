import { NextRequest, NextResponse } from 'next/server'
import { mockOrders } from '@/lib/data'

type EmailType = 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'cod_collected' | 'daily_summary'

function generateEmailHTML(type: EmailType, data: Record<string, unknown>): string {
  const baseStyle = `
    font-family: 'Inter', Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background: #ffffff;
  `

  const header = `
    <div style="background: #1a1c3a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="background: #f4991a; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 20px;">🚚</span>
        </div>
        <div>
          <div style="color: white; font-weight: 800; font-size: 20px;">Shipedo</div>
          <div style="color: rgba(255,255,255,0.5); font-size: 12px;">Logistics Platform</div>
        </div>
      </div>
    </div>
  `

  const footer = `
    <div style="background: #f8fafc; padding: 20px 32px; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
        Need help? Contact us at <a href="mailto:support@shipedo.co.ke" style="color: #f4991a;">support@shipedo.co.ke</a>
      </p>
      <p style="color: #d1d5db; font-size: 11px; margin: 0;">© 2024 Shipedo Kenya — All rights reserved</p>
    </div>
  `

  const templates: Record<EmailType, string> = {
    order_confirmed: `
      <div style="${baseStyle}">
        ${header}
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="background: #dbeafe; border-radius: 10px; padding: 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">✅</span>
            <div>
              <div style="font-weight: 700; color: #1e40af; font-size: 16px;">Order Confirmed!</div>
              <div style="color: #3b82f6; font-size: 13px;">Your order has been confirmed and will be shipped soon.</div>
            </div>
          </div>
          <h2 style="color: #1a1c3a; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">
            Hi ${data.customerName as string}, your order is confirmed!
          </h2>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
            Great news! We've confirmed your order and our team is preparing it for dispatch.
          </p>
          <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Tracking Number</div>
                <div style="font-family: monospace; font-weight: 700; color: #f4991a; font-size: 14px;">${data.trackingNumber as string}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Payment Method</div>
                <div style="font-weight: 700; color: #1a1c3a; font-size: 14px;">Cash on Delivery</div>
              </div>
            </div>
          </div>
          <div style="text-align: center;">
            <a href="https://shipedo.co.ke/track/${data.trackingNumber as string}" style="background: #f4991a; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
              Track Your Order →
            </a>
          </div>
        </div>
        ${footer}
      </div>
    `,

    order_shipped: `
      <div style="${baseStyle}">
        ${header}
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="background: #ede9fe; border-radius: 10px; padding: 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">🚚</span>
            <div>
              <div style="font-weight: 700; color: #5b21b6; font-size: 16px;">Your Order is On the Way!</div>
              <div style="color: #7c3aed; font-size: 13px;">Expected delivery: ${data.expectedDelivery as string}</div>
            </div>
          </div>
          <h2 style="color: #1a1c3a; font-size: 20px; font-weight: 700; margin: 0 0 24px 0;">
            Hi ${data.customerName as string}, your order is shipped!
          </h2>
          <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <div style="font-family: monospace; font-size: 18px; font-weight: 800; color: #f4991a; text-align: center; margin-bottom: 8px;">
              ${data.trackingNumber as string}
            </div>
            <div style="text-align: center; font-size: 13px; color: #6b7280;">Use this number to track your delivery</div>
          </div>
          <div style="text-align: center;">
            <a href="https://shipedo.co.ke/track/${data.trackingNumber as string}" style="background: #1a1c3a; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
              🔍 Track Now
            </a>
          </div>
        </div>
        ${footer}
      </div>
    `,

    order_delivered: `
      <div style="${baseStyle}">
        ${header}
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="background: #d1fae5; border-radius: 10px; padding: 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">📦</span>
            <div>
              <div style="font-weight: 700; color: #065f46; font-size: 16px;">Order Delivered!</div>
              <div style="color: #059669; font-size: 13px;">Invoice attached to this email</div>
            </div>
          </div>
          <h2 style="color: #1a1c3a; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">
            Your order has been delivered!
          </h2>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
            We hope you love your order! Your invoice is attached to this email as a PDF.
          </p>
          <div style="background: #1a1c3a; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <div style="color: rgba(255,255,255,0.6); font-size: 12px; margin-bottom: 8px;">Invoice Number</div>
            <div style="color: #f4991a; font-family: monospace; font-weight: 800; font-size: 16px;">${data.invoiceNumber as string}</div>
          </div>
        </div>
        ${footer}
      </div>
    `,

    cod_collected: `
      <div style="${baseStyle}">
        ${header}
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="background: #fef3c7; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
            <div style="font-weight: 700; color: #92400e; font-size: 16px;">💵 COD Cash Collected</div>
            <div style="color: #b45309; font-size: 13px; margin-top: 4px;">
              KES ${(data.amount as number).toLocaleString()} collected for order ${data.trackingNumber as string}
            </div>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Dear ${data.sellerName as string}, cash has been collected from your customer for the above order.
            Payout will be processed within 7 business days.
          </p>
        </div>
        ${footer}
      </div>
    `,

    daily_summary: `
      <div style="${baseStyle}">
        ${header}
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1a1c3a; font-size: 20px; font-weight: 700; margin: 0 0 24px 0;">📊 Daily Summary — ${data.date as string}</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
            ${(['totalOrders', 'delivered', 'pendingCOD', 'returned'] as const).map(key => `
              <div style="background: #f8fafc; border-radius: 10px; padding: 16px;">
                <div style="font-size: 24px; font-weight: 800; color: #1a1c3a;">${(data as Record<string, unknown>)[key] ?? 0}</div>
                <div style="font-size: 12px; color: #9ca3af; margin-top: 4px; text-transform: capitalize;">${key.replace(/([A-Z])/g, ' $1')}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ${footer}
      </div>
    `,
  }

  return templates[type] || ''
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, orderId, data } = body as {
      type: EmailType
      orderId?: string
      data?: Record<string, unknown>
    }

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Email type is required' },
        { status: 400 }
      )
    }

    let emailData = data || {}

    if (orderId) {
      const order = mockOrders.find((o) => o.id === orderId)
      if (order) {
        emailData = {
          customerName: order.customerName,
          trackingNumber: order.trackingNumber,
          invoiceNumber: `INV-${order.trackingNumber.replace('SHP-', '')}`,
          amount: order.totalAmount,
          sellerName: order.sellerName,
          expectedDelivery: '1-3 business days',
          ...data,
        }
      }
    }

    const html = generateEmailHTML(type, emailData)

    // In production: send via SendGrid, Mailgun, or Nodemailer
    // For now we return the generated HTML
    return NextResponse.json({
      success: true,
      message: `Email notification "${type}" queued successfully`,
      preview: html,
      recipient: emailData.customerEmail || emailData.sellerEmail || 'demo@shipedo.co.ke',
      sentAt: new Date().toISOString(),
    })

  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
