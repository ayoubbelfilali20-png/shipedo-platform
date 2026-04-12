'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import {
  Upload, FileSpreadsheet, ArrowLeft, CheckCircle, AlertCircle,
  Trash2, Download, X, Loader2, Eye, EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

/* ── helpers ── */
function generateOrderId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = 'ORD-'
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

interface ParsedOrder {
  row: number
  customer_name: string
  customer_phone: string
  customer_city: string
  customer_address: string
  product_name: string
  quantity: number
  unit_price: number
  status: 'valid' | 'error'
  errors: string[]
}

interface GroupedOrder {
  customer_name: string
  customer_phone: string
  customer_city: string
  customer_address: string
  items: { name: string; quantity: number; unit_price: number }[]
  total: number
  rowNumbers: number[]
  errors: string[]
}

/* Parse CSV text → rows */
function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  return lines.map(line => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++ }
        else if (ch === '"') inQuotes = false
        else current += ch
      } else {
        if (ch === '"') inQuotes = true
        else if (ch === ',' || ch === ';' || ch === '\t') { result.push(current.trim()); current = '' }
        else current += ch
      }
    }
    result.push(current.trim())
    return result
  })
}

/* Normalize header names */
function normalizeHeader(h: string): string {
  const s = h.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (['customername', 'name', 'fullname', 'client', 'clientname', 'nom'].includes(s)) return 'customer_name'
  if (['phone', 'customerphone', 'tel', 'telephone', 'mobile'].includes(s)) return 'customer_phone'
  if (['city', 'customercity', 'ville'].includes(s)) return 'customer_city'
  if (['address', 'customeraddress', 'adresse', 'addr'].includes(s)) return 'customer_address'
  if (['product', 'productname', 'item', 'itemname', 'produit', 'article'].includes(s)) return 'product_name'
  if (['quantity', 'qty', 'quantit'].includes(s)) return 'quantity'
  if (['price', 'unitprice', 'sellingprice', 'prix', 'amount'].includes(s)) return 'unit_price'
  return s
}

/* ── Template CSV ── */
const TEMPLATE_CSV = `customer_name,customer_phone,customer_city,customer_address,product_name,quantity,unit_price
John Doe,+254712345678,Nairobi,123 Kenyatta Ave,iPhone 15 Case,2,1500
John Doe,+254712345678,Nairobi,123 Kenyatta Ave,Screen Protector,1,800
Jane Smith,+254798765432,Mombasa,456 Moi Ave,Samsung Galaxy Cover,1,1200`

export default function ImportOrdersPage() {
  const router = useRouter()
  const { t } = useT()
  const fileRef = useRef<HTMLInputElement>(null)

  const [sellerId, setSellerId] = useState<string | null>(null)
  const [sellerName, setSellerName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedOrder[]>([])
  const [grouped, setGrouped] = useState<GroupedOrder[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)
  const [showPreview, setShowPreview] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('shipedo_seller')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.role === 'seller') { setSellerId(u.id); setSellerName(u.name) }
      }
    } catch {}
  }, [])

  /* Group parsed rows by customer (same name+phone = same order) */
  const groupOrders = useCallback((rows: ParsedOrder[]) => {
    const map = new Map<string, GroupedOrder>()
    rows.forEach(r => {
      const key = `${r.customer_name.toLowerCase()}|${r.customer_phone}`
      if (!map.has(key)) {
        map.set(key, {
          customer_name: r.customer_name,
          customer_phone: r.customer_phone,
          customer_city: r.customer_city,
          customer_address: r.customer_address,
          items: [],
          total: 0,
          rowNumbers: [],
          errors: [],
        })
      }
      const g = map.get(key)!
      g.items.push({ name: r.product_name, quantity: r.quantity, unit_price: r.unit_price })
      g.total += r.quantity * r.unit_price
      g.rowNumbers.push(r.row)
      if (r.errors.length) g.errors.push(...r.errors.map(e => `Row ${r.row}: ${e}`))
    })
    return Array.from(map.values())
  }, [])

  const processFile = useCallback((text: string) => {
    const rows = parseCSV(text)
    if (rows.length < 2) { alert('File is empty or has no data rows'); return }

    const headers = rows[0].map(normalizeHeader)
    const nameIdx    = headers.indexOf('customer_name')
    const phoneIdx   = headers.indexOf('customer_phone')
    const cityIdx    = headers.indexOf('customer_city')
    const addressIdx = headers.indexOf('customer_address')
    const productIdx = headers.indexOf('product_name')
    const qtyIdx     = headers.indexOf('quantity')
    const priceIdx   = headers.indexOf('unit_price')

    if (nameIdx === -1 || phoneIdx === -1 || productIdx === -1) {
      alert('Missing required columns: customer_name, customer_phone, product_name.\n\nFound columns: ' + rows[0].join(', '))
      return
    }

    const parsed: ParsedOrder[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (r.every(c => !c)) continue // skip empty rows

      const errors: string[] = []
      const name    = r[nameIdx] || ''
      const phone   = r[phoneIdx] || ''
      const city    = cityIdx >= 0 ? (r[cityIdx] || '') : ''
      const address = addressIdx >= 0 ? (r[addressIdx] || '') : ''
      const product = r[productIdx] || ''
      const qty     = qtyIdx >= 0 ? parseInt(r[qtyIdx]) || 0 : 1
      const price   = priceIdx >= 0 ? parseFloat(r[priceIdx]) || 0 : 0

      if (!name) errors.push('Missing customer name')
      if (!phone) errors.push('Missing phone')
      if (!product) errors.push('Missing product name')
      if (qty <= 0) errors.push('Invalid quantity')

      parsed.push({
        row: i + 1,
        customer_name: name,
        customer_phone: phone,
        customer_city: city,
        customer_address: address,
        product_name: product,
        quantity: qty <= 0 ? 1 : qty,
        unit_price: price,
        status: errors.length ? 'error' : 'valid',
        errors,
      })
    }

    setParsed(parsed)
    setGrouped(groupOrders(parsed))
    setResult(null)
  }, [groupOrders])

  const handleFile = (file: File) => {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    setFileName(file.name)

    if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
      const reader = new FileReader()
      reader.onload = e => processFile(e.target?.result as string)
      reader.readAsText(file)
    } else {
      alert('Please upload a CSV file (.csv, .txt, .tsv).\n\nFor Excel files, first export as CSV from your spreadsheet app.')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'shipedo-order-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const removeOrder = (idx: number) => {
    setGrouped(prev => prev.filter((_, i) => i !== idx))
  }

  const handleImport = async () => {
    if (!sellerId || grouped.length === 0) return
    const validOrders = grouped.filter(g => g.errors.length === 0)
    if (validOrders.length === 0) { alert('No valid orders to import'); return }

    setImporting(true)
    let success = 0
    let failed = 0

    // Get agent for round-robin
    let agents: { id: string }[] = []
    try {
      const { data } = await supabase.from('agents').select('id').eq('status', 'active')
      agents = data || []
    } catch {}

    let pendingCounts = new Map<string, number>()
    if (agents.length > 1) {
      try {
        const { data: pendingOrders } = await supabase
          .from('orders').select('assigned_agent_id').eq('status', 'pending').not('assigned_agent_id', 'is', null)
        agents.forEach(a => pendingCounts.set(a.id, 0))
        ;(pendingOrders || []).forEach((o: any) => {
          if (pendingCounts.has(o.assigned_agent_id))
            pendingCounts.set(o.assigned_agent_id, (pendingCounts.get(o.assigned_agent_id) || 0) + 1)
        })
      } catch {}
    }

    for (const order of validOrders) {
      // Pick agent with fewest pending
      let agentId: string | null = null
      if (agents.length === 1) {
        agentId = agents[0].id
      } else if (agents.length > 1) {
        let best = Infinity
        for (const [id, c] of pendingCounts.entries()) {
          if (c < best) { best = c; agentId = id }
        }
        if (agentId) pendingCounts.set(agentId, (pendingCounts.get(agentId) || 0) + 1)
      }

      const items = order.items.map(it => ({
        product_id: null,
        name: it.name,
        sku: '',
        quantity: it.quantity,
        unit_price: it.unit_price,
      }))

      const { error } = await supabase.from('orders').insert({
        tracking_number: generateOrderId(),
        seller_id: sellerId,
        seller_name: sellerName,
        assigned_agent_id: agentId,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_city: order.customer_city,
        customer_address: order.customer_address,
        country: 'Kenya',
        source: 'Import',
        items,
        total_amount: order.total,
        status: 'pending',
        payment_method: 'COD',
      })

      if (error) failed++
      else success++
    }

    setImporting(false)
    setResult({ success, failed })
  }

  const validCount = grouped.filter(g => g.errors.length === 0).length
  const errorCount = grouped.filter(g => g.errors.length > 0).length

  /* ── Success result ── */
  if (result) {
    return (
      <div className="min-h-screen bg-[#f5f7fa]">
        <Header title={t('ord_import')} subtitle="" role="seller" />
        <div className="p-6 max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-6">
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto',
              result.failed === 0 ? 'bg-emerald-100' : 'bg-amber-100'
            )}>
              {result.failed === 0
                ? <CheckCircle size={32} className="text-emerald-500" />
                : <AlertCircle size={32} className="text-amber-500" />
              }
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1a1c3a]">Import Complete</h2>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <CheckCircle size={16} />
                  <span className="text-sm font-semibold">{result.success} orders imported successfully</span>
                </div>
                {result.failed > 0 && (
                  <div className="flex items-center justify-center gap-2 text-red-500">
                    <AlertCircle size={16} />
                    <span className="text-sm font-semibold">{result.failed} orders failed</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/seller/orders"
                className="px-6 py-2.5 bg-[#f4991a] hover:bg-orange-500 text-white text-sm font-bold rounded-xl shadow-sm shadow-orange-500/30 transition-all"
              >
                View Orders
              </Link>
              <button
                onClick={() => { setParsed([]); setGrouped([]); setFileName(null); setResult(null) }}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-all"
              >
                Import More
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Header title={t('ord_import')} subtitle="Upload CSV or spreadsheet" role="seller" />

      <div className="px-6 pt-5 pb-8 space-y-5 max-w-4xl">

        {/* Back */}
        <Link href="/seller/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#f4991a] transition-colors">
          <ArrowLeft size={16} /> Back to Orders
        </Link>

        {/* Upload zone */}
        {grouped.length === 0 && (
          <div className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'bg-white rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all',
                dragOver ? 'border-[#f4991a] bg-orange-50/30' : 'border-gray-200 hover:border-[#f4991a]/50 hover:bg-orange-50/10'
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.tsv"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
              />
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload size={28} className="text-[#f4991a]" />
              </div>
              <h3 className="text-lg font-bold text-[#1a1c3a] mb-1">Drop your CSV file here</h3>
              <p className="text-sm text-gray-400 mb-4">or click to browse files</p>
              <p className="text-xs text-gray-300">Supported: .csv, .txt, .tsv</p>
            </div>

            {/* Template + instructions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1a1c3a]">File Format</h3>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all"
                >
                  <Download size={14} /> Download Template
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-left text-gray-500 font-bold">
                      <th className="pr-4 pb-2">customer_name *</th>
                      <th className="pr-4 pb-2">customer_phone *</th>
                      <th className="pr-4 pb-2">customer_city</th>
                      <th className="pr-4 pb-2">customer_address</th>
                      <th className="pr-4 pb-2">product_name *</th>
                      <th className="pr-4 pb-2">quantity</th>
                      <th className="pr-4 pb-2">unit_price</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600">
                    <tr>
                      <td className="pr-4 py-1">John Doe</td>
                      <td className="pr-4 py-1">+254712345678</td>
                      <td className="pr-4 py-1">Nairobi</td>
                      <td className="pr-4 py-1">123 Kenyatta Ave</td>
                      <td className="pr-4 py-1">iPhone 15 Case</td>
                      <td className="pr-4 py-1">2</td>
                      <td className="pr-4 py-1">1500</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-1">John Doe</td>
                      <td className="pr-4 py-1">+254712345678</td>
                      <td className="pr-4 py-1">Nairobi</td>
                      <td className="pr-4 py-1">123 Kenyatta Ave</td>
                      <td className="pr-4 py-1">Screen Protector</td>
                      <td className="pr-4 py-1">1</td>
                      <td className="pr-4 py-1">800</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-gray-400 space-y-1">
                <p><span className="font-semibold text-gray-500">*</span> = required column</p>
                <p>Rows with the same <span className="font-semibold text-gray-500">name + phone</span> are grouped into one order with multiple items.</p>
                <p>Columns can be in any order. Headers are matched automatically (e.g. "Name", "Client", "Full Name" all work).</p>
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {grouped.length > 0 && (
          <div className="space-y-4">

            {/* File info bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet size={20} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1a1c3a]">{fileName}</p>
                  <p className="text-xs text-gray-400">{parsed.length} rows parsed &rarr; {grouped.length} orders</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {validCount > 0 && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg">
                    {validCount} valid
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="px-3 py-1 bg-red-50 text-red-500 text-xs font-bold rounded-lg">
                    {errorCount} with errors
                  </span>
                )}
                <button
                  onClick={() => { setParsed([]); setGrouped([]); setFileName(null) }}
                  className="w-8 h-8 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
                  title="Clear"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Toggle preview */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-[#f4991a] transition-colors"
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPreview ? 'Hide preview' : 'Show preview'}
            </button>

            {/* Order cards */}
            {showPreview && (
              <div className="space-y-3">
                {grouped.map((order, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'bg-white rounded-2xl border shadow-sm p-5 transition-all',
                      order.errors.length > 0 ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-bold text-[#1a1c3a]">{order.customer_name}</p>
                        <p className="text-xs text-gray-400">{order.customer_phone} &middot; {order.customer_city || 'No city'}</p>
                        {order.customer_address && (
                          <p className="text-xs text-gray-300 mt-0.5">{order.customer_address}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#f4991a]">
                          KES {order.total.toLocaleString()}
                        </span>
                        <button
                          onClick={() => removeOrder(idx)}
                          className="w-7 h-7 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-1">
                      {order.items.map((it, j) => (
                        <div key={j} className="flex items-center justify-between text-xs py-1.5 px-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-700 font-medium">{it.name}</span>
                          <span className="text-gray-500">
                            {it.quantity} x KES {it.unit_price.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Errors */}
                    {order.errors.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {order.errors.map((e, j) => (
                          <p key={j} className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={11} /> {e}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Import button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="flex items-center gap-2 px-8 py-3 bg-[#f4991a] hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-sm shadow-orange-500/30 transition-all"
              >
                {importing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Import {validCount} Order{validCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
              <button
                onClick={() => { setParsed([]); setGrouped([]); setFileName(null) }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
