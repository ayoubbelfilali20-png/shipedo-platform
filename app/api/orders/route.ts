import { NextRequest, NextResponse } from 'next/server'
import { mockOrders } from '@/lib/data'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const sellerId = searchParams.get('sellerId')
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

  let orders = [...mockOrders]

  if (status && status !== 'all') {
    orders = orders.filter((o) => o.status === status)
  }

  if (sellerId) {
    orders = orders.filter((o) => o.sellerId === sellerId)
  }

  if (limit) {
    orders = orders.slice(0, limit)
  }

  return NextResponse.json({
    success: true,
    data: orders,
    total: orders.length,
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const required = ['customerName', 'customerPhone', 'customerCity', 'customerAddress', 'products']
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    const newOrder = {
      id: `ord-${Date.now()}`,
      trackingNumber: `SHP-KE-${Date.now().toString().slice(-6)}`,
      ...body,
      status: 'pending',
      callAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: newOrder,
      message: 'Order created successfully',
    }, { status: 201 })

  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
