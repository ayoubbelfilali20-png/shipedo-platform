import { mockOrders } from './data'

export type FlagType = 'duplicate' | 'wrong_number' | 'out_of_region'

export interface OrderFlag {
  type: FlagType
  label: string
  detail: string
  color: string
  bg: string
  border: string
}

// Phone prefixes per country code
const regionPrefixes: Record<string, string[]> = {
  KE:    ['+254', '07', '01'],
  MA:    ['+212', '06', '07'],
  TZ:    ['+255', '07'],
  UG:    ['+256', '07'],
  NG:    ['+234', '07', '08', '09'],
  ZA:    ['+27', '06', '07', '08'],
  ET:    ['+251', '09'],
  AE:    ['+971', '05'],
  FR:    ['+33', '06', '07'],
  OTHER: [],
}

// Known bad/wrong numbers (in real app this would come from DB)
const knownWrongNumbers = new Set([
  '+254700000000',
  '+254711111111',
  '+254722222222',
])

export function getOrderFlags(
  phone: string,
  productIds: string[],
  country: string,
  excludeOrderId?: string
): OrderFlag[] {
  const flags: OrderFlag[] = []
  const cleanPhone = phone.replace(/\s+/g, '')

  // ── 1. Duplicate: same phone + same product already ordered ──
  const dupOrder = mockOrders.find(o => {
    if (excludeOrderId && o.id === excludeOrderId) return false
    if (o.customerPhone.replace(/\s+/g, '') !== cleanPhone) return false
    return o.products.some(op =>
      productIds.some(pid => {
        // match by name similarity (mock data uses names not IDs)
        return op.name === pid || true // in mock, we check phone match is enough for demo
      })
    )
  })

  // Simpler: duplicate = same phone number already has an active order
  const existingOrders = mockOrders.filter(o => {
    if (excludeOrderId && o.id === excludeOrderId) return false
    return o.customerPhone.replace(/\s+/g, '') === cleanPhone &&
      !['delivered', 'returned', 'cancelled'].includes(o.status)
  })

  if (existingOrders.length > 0) {
    flags.push({
      type: 'duplicate',
      label: 'Duplicate Order',
      detail: `This phone already has ${existingOrders.length} active order(s)`,
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    })
  }

  // ── 2. Wrong number ──
  if (knownWrongNumbers.has(cleanPhone)) {
    flags.push({
      type: 'wrong_number',
      label: 'Wrong Number',
      detail: 'This number has been flagged as unreachable or invalid',
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
    })
  }

  // ── 3. Out of region ──
  if (cleanPhone && country && country !== 'OTHER') {
    const allowed = regionPrefixes[country] ?? []
    if (allowed.length > 0) {
      const matchesRegion = allowed.some(prefix => cleanPhone.startsWith(prefix))
      if (!matchesRegion) {
        flags.push({
          type: 'out_of_region',
          label: 'Out of Region',
          detail: `Phone prefix doesn't match ${country} — double-check the number`,
          color: 'text-purple-700',
          bg: 'bg-purple-50',
          border: 'border-purple-200',
        })
      }
    }
  }

  return flags
}

// Get flags for an existing order (for display in list)
export function getExistingOrderFlags(orderId: string): OrderFlag[] {
  const order = mockOrders.find(o => o.id === orderId)
  if (!order) return []

  // Detect duplicate: same phone, multiple orders
  const samePhone = mockOrders.filter(o =>
    o.id !== orderId &&
    o.customerPhone.replace(/\s+/g, '') === order.customerPhone.replace(/\s+/g, '')
  )

  const flags: OrderFlag[] = []

  if (samePhone.length > 0) {
    flags.push({
      type: 'duplicate',
      label: 'Duplicate',
      detail: `${samePhone.length + 1} orders from same phone`,
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    })
  }

  const cleanPhone = order.customerPhone.replace(/\s+/g, '')
  if (knownWrongNumbers.has(cleanPhone)) {
    flags.push({
      type: 'wrong_number',
      label: 'Wrong #',
      detail: 'Flagged as unreachable',
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
    })
  }

  return flags
}
