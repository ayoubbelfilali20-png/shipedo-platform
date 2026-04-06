import { NextRequest, NextResponse } from 'next/server'
import { mockOrders } from '@/lib/data'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const order = mockOrders.find((o) => o.id === id || o.trackingNumber === id)

  if (!order) {
    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: order })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const order = mockOrders.find((o) => o.id === id)

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled']
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
    }

    const updated = { ...order, ...body, updatedAt: new Date().toISOString() }
    return NextResponse.json({ success: true, data: updated, message: 'Order updated successfully' })
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }
}
