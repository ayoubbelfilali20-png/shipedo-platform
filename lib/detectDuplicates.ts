export type DuplicateInfo = {
  isDuplicate: boolean
  duplicateOf?: string // tracking number of the other order
}

export function detectDuplicates(orders: any[]): Map<string, DuplicateInfo> {
  const result = new Map<string, DuplicateInfo>()
  const activeStatuses = ['pending', 'confirmed', 'prepared', 'shipped']

  // Group orders by normalized phone number
  const byPhone = new Map<string, any[]>()
  for (const o of orders) {
    const phone = (o.customer_phone || '').replace(/[^\d]/g, '').slice(-9)
    if (!phone) continue
    const list = byPhone.get(phone) || []
    list.push(o)
    byPhone.set(phone, list)
  }

  for (const [, group] of byPhone) {
    if (group.length < 2) continue

    for (let i = 0; i < group.length; i++) {
      const a = group[i]
      if (!activeStatuses.includes(a.status)) continue
      const aProducts = getProductKey(a.items)

      for (let j = 0; j < group.length; j++) {
        if (i === j) continue
        const b = group[j]
        if (!activeStatuses.includes(b.status)) continue
        const bProducts = getProductKey(b.items)

        if (aProducts === bProducts) {
          result.set(a.id, { isDuplicate: true, duplicateOf: b.tracking_number })
          break
        }
      }
    }
  }

  return result
}

function getProductKey(items: any[]): string {
  if (!Array.isArray(items) || items.length === 0) return ''
  return items
    .map((it: any) => (it.name || it.sku || '').toLowerCase())
    .sort()
    .join('|')
}
