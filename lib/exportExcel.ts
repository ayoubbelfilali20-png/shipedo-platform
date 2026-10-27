import * as XLSX from 'xlsx'
import { getCountry } from '@/lib/countries'

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
    const cur = getCountry(o.country || countryCode).currencySymbol
    return {
      'Tracking #': o.tracking_number || '',
      'Delivery Tracking': o.delivery_tracking || '',
      'Customer Name': o.customer_name || '',
      'Phone': o.customer_phone || '',
      'City': o.customer_city || '',
      'Address': o.customer_address || '',
      'Products': productNames,
      'Amount': `${cur} ${(o.total_amount || 0).toLocaleString()}`,
      'Payment': o.payment_method || '',
      'Status': o.status || '',
      'Order Date': o.created_at ? new Date(o.created_at).toLocaleDateString('en-GB') : '',
      'Shipped Date': o.shipped_at ? new Date(o.shipped_at).toLocaleDateString('en-GB') : '',
    }
  })
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 16 },
    { wch: 16 }, { wch: 28 }, { wch: 30 }, { wch: 14 },
    { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Orders')
  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, filename || `Shipedo_Orders_${today}.xlsx`)
}
