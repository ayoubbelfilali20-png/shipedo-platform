'use client'

type PrintLabelProps = {
  tracking: string
  customerName: string
  customerPhone: string
  customerAddress: string
  customerCity: string
  items: { name?: string; quantity?: number; price?: number; unit_price?: number }[]
  totalAmount: number
  paymentMethod?: string
}

export function printOrderLabel(order: PrintLabelProps) {
  const items = order.items || []
  const itemsHtml = items.map((p, i) =>
    `<tr>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:12px">${p.name || 'Item ' + (i + 1)}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:12px;text-align:center">${p.quantity || 1}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:12px;text-align:right">KES ${(Number(p.unit_price || p.price || 0) * (p.quantity || 1)).toLocaleString()}</td>
    </tr>`
  ).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order ${order.tracking}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; padding: 20px; }
    .label { width: 100%; max-width: 400px; margin: 0 auto; border: 2px solid #000; border-radius: 8px; overflow: hidden; }
    .header { background: #1a1c3a; color: #fff; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; }
    .header .logo { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
    .header .logo span { color: #f4991a; }
    .header .tracking { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 2px; }
    .barcode-wrap { text-align: center; padding: 10px 16px 6px; border-bottom: 1px dashed #ccc; }
    .barcode-wrap svg { width: 100%; max-height: 60px; }
    .barcode-text { font-family: monospace; font-size: 14px; font-weight: bold; letter-spacing: 2px; margin-top: 2px; }
    .section { padding: 12px 16px; border-bottom: 1px dashed #ccc; }
    .section:last-child { border-bottom: none; }
    .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: #999; margin-bottom: 6px; }
    .customer-name { font-size: 16px; font-weight: bold; color: #1a1c3a; }
    .customer-detail { font-size: 12px; color: #555; margin-top: 3px; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th { font-size: 10px; text-transform: uppercase; color: #999; padding: 4px 8px; text-align: left; border-bottom: 2px solid #eee; }
    .items-table th:last-child { text-align: right; }
    .items-table th:nth-child(2) { text-align: center; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: #f8f8f8; }
    .total-label { font-size: 11px; font-weight: bold; color: #999; text-transform: uppercase; }
    .total-value { font-size: 18px; font-weight: 900; color: #1a1c3a; }
    .payment-badge { display: inline-block; background: #f4991a; color: #fff; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 4px; margin-left: 8px; }
    .footer { text-align: center; padding: 8px; font-size: 9px; color: #aaa; }
    @media print {
      body { padding: 0; }
      .label { border: 2px solid #000; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">
      <div>
        <div class="logo">SHIP<span>EDO</span></div>
        <div class="tracking">${order.tracking}</div>
      </div>
      <div style="text-align:right;font-size:10px;color:rgba(255,255,255,0.5)">
        ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
    </div>

    <div class="barcode-wrap">
      <svg id="barcode"></svg>
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

    <div class="footer">shipedo.com &middot; Powered by Shipedo</div>
  </div>

  <script>
    JsBarcode("#barcode", "${order.tracking}", {
      format: "CODE128",
      width: 2,
      height: 50,
      displayValue: false,
      margin: 0,
    });
    window.onload = function() { setTimeout(function() { window.print(); }, 300); };
  </script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=500,height=700')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}
