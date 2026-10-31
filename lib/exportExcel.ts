import * as XLSX from 'xlsx'

export function exportOrdersExcel(
  orders: any[],
  countryCode: string,
  filename?: string,
) {
  const rows = orders.map(o => {
    const items = Array.isArray(o.items) ? o.items : []
    const productNames = items.map((it: any) => {
      const q = Number(it.quantity) || 1
      return q > 1 ? `${it.name || 'Item'} x${q}` : (it.name || 'Item')
    }).join(', ')
    const shippedDate = o.shipped_to_agent_at || o.shipped_at
    return {
      'Delivery Tracking': o.delivery_tracking || o.tracking_number || '',
      'Date': shippedDate ? new Date(shippedDate).toLocaleDateString('en-GB') : '',
      'Name of Client': o.customer_name || '',
      'Phone No': o.customer_phone || '',
      'Region': o.customer_city || '',
      'Products': productNames,
      'Amount': o.total_amount || 0,
    }
  })
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 18 }, { wch: 14 }, { wch: 24 }, { wch: 16 },
    { wch: 16 }, { wch: 30 }, { wch: 14 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Orders')
  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, filename || `Shipedo_Orders_${today}.xlsx`)
}
