import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { sheetUrl, orders } = await req.json()

    if (!sheetUrl || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ ok: false, error: 'Missing sheetUrl or orders' }, { status: 400 })
    }

    const res = await fetch(sheetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
      redirect: 'follow',
    })

    const text = await res.text()
    let result: any
    try { result = JSON.parse(text) } catch { result = { raw: text } }

    return NextResponse.json({ ok: true, result })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
