import { NextRequest, NextResponse } from 'next/server'
import { mockOrders } from '@/lib/data'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params
  const order = mockOrders.find((o) => o.id === orderId || o.trackingNumber === orderId)

  if (!order) {
    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
  }

  const deliveryFee = 350
  const invoiceData = {
    invoiceNumber: `INV-${order.trackingNumber.replace('SHP-', '')}`,
    orderId: order.id,
    trackingNumber: order.trackingNumber,
    issueDate: order.createdAt,
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      address: order.customerAddress,
      city: order.customerCity,
    },
    seller: { id: order.sellerId, name: order.sellerName },
    items: order.products.map((p) => ({
      name: p.name, sku: p.sku, quantity: p.quantity,
      unitPrice: p.price, total: p.price * p.quantity,
    })),
    subtotal: order.totalAmount,
    deliveryFee,
    total: order.totalAmount + deliveryFee,
    paymentMethod: order.paymentMethod,
    status: order.status,
    generatedAt: new Date().toISOString(),
  }

  return NextResponse.json({ success: true, data: invoiceData })
}
