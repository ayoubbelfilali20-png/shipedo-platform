export type DuplicateInfo = {
  isDuplicate: boolean
  isSameClient: boolean
  duplicateOf?: string // tracking number of the other order
  otherOrders?: string[] // tracking numbers of all other orders from same client
}

export function detectDuplicates(orders: any[]): Map<string, DuplicateInfo> {
  const result = new Map<string, DuplicateInfo>()
  const activeStatuses = ['pending', 'confirmed', 'prepared', 'shipped_to_agent', 'shipped']

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

    const activeGroup = group.filter(o => activeStatuses.includes(o.status))
    if (activeGroup.length < 2) continue

    for (const a of activeGroup) {
      const aProducts = getProductKey(a.items)
      const others = activeGroup.filter(b => b.id !== a.id)
      const exactDup = others.find(b => getProductKey(b.items) === aProducts)

      result.set(a.id, {
        isDuplicate: !!exactDup,
        isSameClient: true,
        duplicateOf: exactDup?.tracking_number,
        otherOrders: others.map(b => b.tracking_number),
      })
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
