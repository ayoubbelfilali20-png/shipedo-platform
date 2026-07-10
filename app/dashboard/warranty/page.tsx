'use client'

import { useEffect, useState, useRef } from 'react'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import {
  Plus, Search, FileText, Printer, X, Calendar, Shield,
} from 'lucide-react'

type WarrantyInvoice = {
  id: string
  invoice_number: string
  customer_name: string
  customer_phone?: string
  product_name: string
  product_price: number
  warranty_text: string
  invoice_date: string
  warranty_start: string
  warranty_end: string
  created_at: string
}

type OrderMatch = {
  id: string
  tracking_number: string
  customer_name: string
  customer_phone: string
  items: any[]
  total_amount: number
}

const DEFAULT_WARRANTY = `Covers manufacturing defects only.
Does not cover broken screens, liquid damage, physical damage, power surges, misuse, accessories, or normal wear and tear.
The original invoice must be presented for all warranty claims.
Repair or replacement is at the seller's discretion after product inspection.`

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function printInvoice(inv: WarrantyInvoice) {
  const w = window.open('', '_blank', 'width=800,height=900')
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head><title>Warranty Invoice ${inv.invoice_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1c3a; }
  .header { text-align: center; border-bottom: 3px solid #f4991a; padding-bottom: 20px; margin-bottom: 30px; }
  .company { font-size: 22px; font-weight: 800; color: #1a1c3a; letter-spacing: 1px; }
  .subtitle { font-size: 11px; color: #888; margin-top: 4px; }
  .contact { font-size: 11px; color: #555; margin-top: 8px; }
  .invoice-title { text-align: center; font-size: 18px; font-weight: 700; color: #f4991a; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 25px; flex-wrap: wrap; gap: 15px; }
  .meta-item { }
  .meta-label { color: #888; font-weight: 600; text-transform: uppercase; font-size: 10px; }
  .meta-value { font-weight: 700; font-size: 14px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
  th { background: #1a1c3a; color: white; padding: 10px 15px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 12px 15px; border-bottom: 1px solid #eee; font-size: 13px; }
  .total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid #1a1c3a; background: #f8f9fa; }
  .warranty-box { background: #fff8f0; border: 2px solid #f4991a; border-radius: 8px; padding: 20px; margin-bottom: 25px; }
  .warranty-title { font-size: 13px; font-weight: 700; color: #f4991a; margin-bottom: 8px; }
  .warranty-text { font-size: 12px; color: #555; line-height: 1.6; }
  .warranty-dates { display: flex; gap: 30px; margin-top: 12px; padding-top: 10px; border-top: 1px dashed #f4991a; }
  .warranty-dates div { font-size: 12px; }
  .warranty-dates .label { font-size: 10px; color: #888; font-weight: 600; text-transform: uppercase; }
  .warranty-dates .value { font-weight: 700; color: #1a1c3a; margin-top: 2px; }
  .footer { text-align: center; border-top: 2px solid #eee; padding-top: 20px; margin-top: 30px; }
  .footer p { font-size: 10px; color: #999; }
  .stamp { display: inline-block; border: 2px solid #f4991a; color: #f4991a; padding: 8px 20px; font-weight: 800; font-size: 14px; border-radius: 4px; transform: rotate(-5deg); margin-top: 15px; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <div class="company">SHIPDAF GENERAL TRADING LIMITED</div>
  <div class="subtitle">General Trading & Electronics</div>
  <div class="contact">Kilimani, Padmore Residences B105, Nairobi, Kenya<br>Tel: 0735 838 597 | 0788 287 184</div>
</div>
<div class="invoice-title">Warranty Invoice</div>
<div class="meta">
  <div class="meta-item"><div class="meta-label">Invoice No.</div><div class="meta-value">${inv.invoice_number}</div></div>
  <div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">${fmtDate(inv.invoice_date)}</div></div>
  <div class="meta-item"><div class="meta-label">Customer</div><div class="meta-value">${inv.customer_name}</div>${inv.customer_phone ? `<div style="font-size:11px;color:#888;margin-top:2px">${inv.customer_phone}</div>` : ''}</div>
</div>
<table>
  <thead><tr><th>Product</th><th style="text-align:right">Price (KES)</th></tr></thead>
  <tbody>
    <tr><td>${inv.product_name}</td><td style="text-align:right">${inv.product_price.toLocaleString()}</td></tr>
    <tr class="total-row"><td>Total</td><td style="text-align:right">KES ${inv.product_price.toLocaleString()}</td></tr>
  </tbody>
</table>
<div class="warranty-box">
  <div class="warranty-title">⛨ Warranty Terms</div>
  <div style="font-size:13px;font-weight:700;color:#1a1c3a;margin-bottom:8px">Warranty Period: ${fmtDate(inv.warranty_start)} — ${fmtDate(inv.warranty_end)}</div>
  <div class="warranty-text">${inv.warranty_text.replace(/\n/g, '<br>')}</div>
  <div class="warranty-dates">
    <div><div class="label">Start Date</div><div class="value">${fmtDate(inv.warranty_start)}</div></div>
    <div><div class="label">End Date</div><div class="value">${fmtDate(inv.warranty_end)}</div></div>
  </div>
</div>
<div class="footer">
  <div class="stamp">WARRANTY COVERED</div>
  <p style="margin-top:15px">Thank you for your purchase!</p>
  <p>SHIPDAF GENERAL TRADING LIMITED — Kilimani, Padmore Residences B105, Nairobi</p>
</div>
</body></html>`)
  w.document.close()
  setTimeout(() => w.print(), 300)
}

export default function WarrantyPage() {
  const [invoices, setInvoices] = useState<WarrantyInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form
  const [customerSearch, setCustomerSearch] = useState('')
  const [orderResults, setOrderResults] = useState<OrderMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [warrantyText, setWarrantyText] = useState(DEFAULT_WARRANTY)
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [warrantyStart, setWarrantyStart] = useState(() => new Date().toISOString().slice(0, 10))
  const [warrantyEnd, setWarrantyEnd] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10)
  })
  const searchTimeout = useRef<any>(null)

  useEffect(() => {
    fetch('/api/admin/warranty').then(r => r.json())
      .then(result => { setInvoices(result.invoices || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const searchOrders = (q: string) => {
    setCustomerSearch(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.trim().length < 2) { setOrderResults([]); setShowDropdown(false); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const s = q.trim()
      const { data } = await supabase.from('orders')
        .select('id, tracking_number, customer_name, customer_phone, items, total_amount')
        .or(`customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%,tracking_number.ilike.%${s}%`)
        .in('status', ['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered'])
        .order('created_at', { ascending: false })
        .limit(10)
      setOrderResults((data || []) as OrderMatch[])
      setShowDropdown(true)
      setSearching(false)
    }, 300)
  }

  const selectOrder = (o: OrderMatch) => {
    setCustomerName(o.customer_name)
    setCustomerPhone(o.customer_phone)
    const items = Array.isArray(o.items) ? o.items : []
    setProductName(items.map((it: any) => `${it.name || 'Item'} x${it.quantity || 1}`).join(', '))
    setProductPrice(String(o.total_amount || 0))
    setCustomerSearch('')
    setShowDropdown(false)
    setOrderResults([])
  }

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    return !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.customer_name.toLowerCase().includes(q) ||
      (inv.customer_phone || '').includes(q) ||
      inv.product_name.toLowerCase().includes(q)
  })

  const handleCreate = async () => {
    if (!customerName.trim() || !productName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/warranty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          product_name: productName.trim(),
          product_price: parseFloat(productPrice) || 0,
          warranty_text: warrantyText.trim(),
          invoice_date: new Date(invoiceDate).toISOString(),
          warranty_start: new Date(warrantyStart).toISOString(),
          warranty_end: new Date(warrantyEnd).toISOString(),
        }),
      })
      const result = await res.json()
      if (result.ok && result.invoice) {
        setInvoices(prev => [result.invoice, ...prev])
        printInvoice(result.invoice)
        setCustomerName(''); setCustomerPhone(''); setProductName(''); setProductPrice('')
        setWarrantyText(DEFAULT_WARRANTY); setInvoiceDate(new Date().toISOString().slice(0, 10))
        setWarrantyStart(new Date().toISOString().slice(0, 10))
        const d = new Date(); d.setFullYear(d.getFullYear() + 1); setWarrantyEnd(d.toISOString().slice(0, 10))
        setShowForm(false)
      }
    } catch {}
    setSaving(false)
  }

  const resetForm = () => {
    setShowForm(false); setCustomerName(''); setCustomerPhone(''); setProductName(''); setProductPrice('')
    setWarrantyText(DEFAULT_WARRANTY); setCustomerSearch(''); setOrderResults([]); setShowDropdown(false)
  }

  return (
    <div className="p-6 space-y-4">
      <Header title="Warranty Invoices" subtitle={`${invoices.length} invoice(s)`} />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, product, invoice..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-xl">
          <Plus size={14} /> New Warranty Invoice
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-[#1a1c3a] flex items-center gap-2"><Shield size={16} className="text-[#f4991a]" /> Create Warranty Invoice</h3>

          {/* Order search autocomplete */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Search Client (name, phone, or tracking #)</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={customerSearch} onChange={e => searchOrders(e.target.value)}
                placeholder="Type client name or phone to auto-fill..."
                className="w-full pl-9 pr-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs focus:outline-none focus:border-[#f4991a]" />
              {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">Searching...</span>}
            </div>
            {showDropdown && orderResults.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {orderResults.map(o => (
                  <button key={o.id} onClick={() => selectOrder(o)}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#1a1c3a]">{o.customer_name}</p>
                        <p className="text-[10px] text-gray-400">{o.customer_phone} · {o.tracking_number}</p>
                      </div>
                      <span className="text-xs font-bold text-[#f4991a]">KES {(o.total_amount || 0).toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {(Array.isArray(o.items) ? o.items : []).map((it: any) => `${it.name || 'Item'} x${it.quantity || 1}`).join(', ')}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && orderResults.length === 0 && !searching && customerSearch.length >= 2 && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-xs text-gray-400">No orders found</div>
            )}
          </div>

          {customerName && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
              Selected: <strong>{customerName}</strong> {customerPhone && `· ${customerPhone}`} · {productName} · KES {parseFloat(productPrice || '0').toLocaleString()}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Customer Name *</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#f4991a]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Customer Phone</label>
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#f4991a]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Product Name *</label>
              <input value={productName} onChange={e => setProductName(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#f4991a]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Price (KES)</label>
              <input type="number" value={productPrice} onChange={e => setProductPrice(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#f4991a]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Invoice Date</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#f4991a]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Warranty Start</label>
                <input type="date" value={warrantyStart} onChange={e => setWarrantyStart(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#f4991a]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Warranty End</label>
                <input type="date" value={warrantyEnd} onChange={e => setWarrantyEnd(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#f4991a]" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Warranty Terms</label>
            <textarea value={warrantyText} onChange={e => setWarrantyText(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#f4991a] resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !customerName.trim() || !productName.trim()}
              className="px-5 py-2.5 bg-[#f4991a] hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg">
              {saving ? 'Creating...' : 'Create & Print'}
            </button>
            <button onClick={resetForm}
              className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Invoices list */}
      <div className="space-y-2">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-sm text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No warranty invoices</p>
          </div>
        ) : filtered.map(inv => (
          <div key={inv.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between bg-gray-50/40 border-b border-gray-50">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="text-xs font-mono font-bold text-[#f4991a]">{inv.invoice_number}</span>
                <span className="text-xs font-bold text-[#1a1c3a]">{inv.customer_name}</span>
                {inv.customer_phone && <span className="text-[10px] text-gray-400">{inv.customer_phone}</span>}
                <span className="text-xs font-bold text-emerald-600">KES {inv.product_price.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Calendar size={10} /> {new Date(inv.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <button onClick={() => printInvoice(inv)}
                  className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600">
                  <Printer size={12} />
                </button>
              </div>
            </div>
            <div className="px-4 py-2.5 space-y-1">
              <p className="text-xs text-gray-600"><span className="font-semibold">Product:</span> {inv.product_name}</p>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Start: {new Date(inv.warranty_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <span className="text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">End: {new Date(inv.warranty_end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
