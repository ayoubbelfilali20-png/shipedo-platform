'use client'

export type PrintLabelProps = {
  id?: string
  tracking: string
  customerName: string
  customerPhone: string
  customerAddress: string
  customerCity: string
  items: { name?: string; quantity?: number; price?: number; unit_price?: number }[]
  totalAmount: number
  paymentMethod?: string
}

function buildLabelHtml(order: PrintLabelProps) {
  const items = order.items || []
  const itemsHtml = items.map((p, i) =>
    `<tr>
      <td style="padding:4px 8px;border-bottom:1px solid #ddd;font-size:13px">${p.name || 'Item ' + (i + 1)}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #ddd;font-size:13px;text-align:center">${p.quantity || 1}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #ddd;font-size:13px;text-align:right">KES ${(Number(p.unit_price || p.price || 0) * (p.quantity || 1)).toLocaleString()}</td>
    </tr>`
  ).join('')

  return `
  <div class="label">
    <div class="header">
      <div>
        <div class="logo">SHIPEDO</div>
        <div class="tracking">${order.tracking}</div>
      </div>
      <div style="text-align:right;font-size:12px;color:#666">
        ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
    </div>
    <div class="barcode-wrap">
      <svg class="barcode" data-tracking="${order.tracking}"></svg>
    </div>
    <div class="section">
      <div class="section-title">Deliver to</div>
      <div class="customer-name">${order.customerName}</div>
      <div class="customer-detail">${order.customerPhone}</div>
      <div class="customer-detail">${order.customerAddress}</div>
      <div class="customer-detail" style="font-weight:bold">${order.customerCity}</div>
    </div>
    <div class="section">
      <div class="section-title">Items (${items.length})</div>
      <table class="items-table">
        <thead><tr><th>Product</th><th>Qty</th><th style="text-align:right">Price</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>
    <div class="total-row">
      <span class="total-label">Total ${order.paymentMethod ? `<span class="payment-badge">${order.paymentMethod}</span>` : ''}</span>
      <span class="total-value">KES ${(order.totalAmount || 0).toLocaleString()}</span>
    </div>
  </div>`
}

/* 4 × 6 inch label — each label on its own page */
const pageStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; }
  .label {
    width: 4in; height: 6in;
    border: 2px solid #000; border-radius: 4px; overflow: hidden;
    display: flex; flex-direction: column;
    page-break-after: always;
    margin: 0 auto;
  }
  .label:last-child { page-break-after: auto; }
  .header { background: #000; color: #fff; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .header .logo { font-size: 20px; font-weight: 900; letter-spacing: 2px; }
  .header .tracking { font-size: 13px; color: rgba(255,255,255,0.7); margin-top: 2px; }
  .barcode-wrap { text-align: center; padding: 10px 16px 6px; border-bottom: 1px dashed #999; flex-shrink: 0; }
  .barcode-wrap svg { width: 100%; max-height: 52px; }
  .section { padding: 10px 16px; border-bottom: 1px dashed #999; }
  .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: #666; margin-bottom: 5px; }
  .customer-name { font-size: 17px; font-weight: bold; color: #000; }
  .customer-detail { font-size: 14px; color: #333; margin-top: 3px; }
  .items-table { width: 100%; border-collapse: collapse; }
  .items-table th { font-size: 11px; text-transform: uppercase; color: #666; padding: 4px 8px; text-align: left; border-bottom: 1px solid #ccc; }
  .items-table th:last-child { text-align: right; }
  .items-table th:nth-child(2) { text-align: center; }
  .total-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: #eee; flex-shrink: 0; margin-top: auto; }
  .total-label { font-size: 13px; font-weight: bold; color: #555; text-transform: uppercase; }
  .total-value { font-size: 20px; font-weight: 900; color: #000; }
  .payment-badge { display: inline-block; background: #000; color: #fff; font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 3px; margin-left: 6px; }
  @page { size: 4in 6in; margin: 0; }
  @media print {
    body { padding: 0; }
    .label { border: 1px solid #000; }
  }
  @media screen {
    body { padding: 20px; background: #f0f0f0; }
    .label { margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  }
`

function openPrintWindow(labelsHtml: string) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print Labels</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <style>${pageStyles}</style>
</head>
<body>
  ${labelsHtml}
  <script>
    document.querySelectorAll('.barcode').forEach(function(el) {
      JsBarcode(el, el.dataset.tracking, {
        format: "CODE128", width: 2, height: 48, displayValue: false, margin: 0,
      });
    });
    window.onload = function() { setTimeout(function() { window.print(); }, 400); };
  <\/script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=420,height=650')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

/** Print a single order label */
export function printOrderLabel(order: PrintLabelProps) {
  openPrintWindow(buildLabelHtml(order))
}

/** Print multiple order labels at once — each on its own 4×6 page */
export function printOrderLabels(orders: PrintLabelProps[]) {
  if (orders.length === 0) return
  const html = orders.map(o => buildLabelHtml(o)).join('\n')
  openPrintWindow(html)
}
