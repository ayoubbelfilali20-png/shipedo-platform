'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { Expedition } from '@/lib/types'
import { addStoredExpedition } from '@/lib/expeditionStore'
import {
  ArrowLeft, Package, Save, Plus, Trash2, ChevronDown, User, Truck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Argentina','Australia','Austria','Bahrain','Bangladesh','Belgium','Brazil',
  'Bulgaria','Cambodia','Cameroon','Canada','Chile','China','Colombia','Czech Republic','Denmark','Egypt',
  'Ethiopia','Finland','France','Germany','Ghana','Greece','Hong Kong','Hungary','India','Indonesia',
  'Iran','Iraq','Ireland','Israel','Italy','Ivory Coast','Japan','Jordan','Kazakhstan','Kenya',
  'Kuwait','Lebanon','Libya','Madagascar','Malaysia','Mali','Mauritania','Mexico','Morocco','Netherlands',
  'New Zealand','Nigeria','Norway','Oman','Pakistan','Peru','Philippines','Poland','Portugal','Qatar',
  'Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Somalia','South Africa',
  'South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tanzania','Thailand',
  'Tunisia','Turkey','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Venezuela',
  'Vietnam','Yemen','Zambia','Zimbabwe',
]

const TRANSPORT_MODES = ['Air Freight', 'Sea Freight', 'Land Freight', 'Express Courier']

function generateRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let r = 'EXP-'
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)]
  return r
}

interface ProductRow {
  product_id: string
  name: string
  sku: string
  price: number
  quantity: number
}

export default function SellerNewExpeditionPage() {
  const router = useRouter()

  const [from, setFrom] = useState('')
  const [packages, setPackages] = useState('1')
  const [expDate, setExpDate] = useState('')
  const [transport, setTransport] = useState('')
  const [supplier, setSupplier] = useState('')
  const [forwarder, setForwarder] = useState('')
  const [notes, setNotes] = useState('')

  const [sellerProducts, setSellerProducts] = useState<any[]>([])
  const [selected, setSelected] = useState<ProductRow[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // load seller products
  useEffect(() => {
    let sellerId: string | null = null
    try {
      const u = localStorage.getItem('shipedo_user')
      if (u) {
        const parsed = JSON.parse(u)
        if (parsed.role === 'seller') sellerId = parsed.id
      }
    } catch {}
    if (!sellerId) return
    supabase
      .from('products')
      .select('id, name, sku, selling_price, buying_price, image_url')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setSellerProducts(data || []))
  }, [])

  const addProduct = (p: any) => {
    if (selected.find(s => s.product_id === p.id)) return
    setSelected(prev => [...prev, {
      product_id: p.id,
      name: p.name,
      sku: p.sku || '',
      price: Number(p.buying_price) || Number(p.selling_price) || 0,
      quantity: 1,
    }])
    setPickerOpen(false)
  }

  const updateRow = (id: string, field: 'price' | 'quantity', value: number) => {
    setSelected(prev => prev.map(r => r.product_id === id ? { ...r, [field]: value } : r))
  }

  const removeRow = (id: string) => setSelected(prev => prev.filter(r => r.product_id !== id))

  const totalUnits = selected.reduce((a, r) => a + (r.quantity || 0), 0)
  const totalCost = selected.reduce((a, r) => a + (r.price || 0) * (r.quantity || 0), 0)

  const canSave = from && expDate && transport && supplier && selected.length > 0

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    let sellerId = ''
    let sellerName = ''
    try {
      const u = localStorage.getItem('shipedo_user')
      if (u) {
        const parsed = JSON.parse(u)
        sellerId = parsed.id || ''
        sellerName = parsed.name || parsed.email || ''
      }
    } catch {}

    const ref = generateRef()
    const exp: Expedition = {
      id: `exp-${Date.now()}`,
      reference: ref,
      origin: (from as any),
      originCity: from,
      destination: 'Kenya',
      status: 'pending',
      products: selected.map(r => ({
        name: r.name,
        sku: r.sku,
        quantity: r.quantity,
        unitCost: r.price,
        sellerId,
        sellerName,
      })),
      totalItems: totalUnits,
      totalCost,
      shippingCost: 0,
      customsFee: 0,
      estimatedArrival: expDate,
      carrier: transport,
      trackingNumber: '',
      notes: `Supplier: ${supplier}${forwarder ? ` · Forwarder: ${forwarder}` : ''}${notes ? ` · ${notes}` : ''} · Packages: ${packages}`,
      createdBy: sellerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addStoredExpedition(exp)
    setSaving(false)
    router.push('/seller/expeditions')
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Header title="New Expedition" subtitle="" role="seller" />

      <div className="px-6 pt-6 pb-10 max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/seller/expeditions" className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white shadow-sm transition-all">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-emerald-600">New Expedition</h1>
        </div>

        {/* Package Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
              <User size={18} className="text-gray-500" />
            </div>
            <h2 className="text-lg font-bold text-[#1a1c3a]">Package Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <FieldSelect label="From" required value={from} onChange={setFrom} options={COUNTRIES} placeholder="Select origin country" />
            <FieldNumber label="Number Of Packages" required value={packages} onChange={setPackages} />
            <FieldDate label="Expedition Date" required value={expDate} onChange={setExpDate} />
            <FieldSelect label="Transport Mode" required value={transport} onChange={setTransport} options={TRANSPORT_MODES} placeholder="Select transport mode" />
            <FieldText label="Nom De Fournisseur" required value={supplier} onChange={setSupplier} />
            <FieldText label="Nom De Transitaire" value={forwarder} onChange={setForwarder} />
          </div>

          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
            <Truck size={14} />
            <span><strong>To:</strong> Kenya 🇰🇪 (only destination available)</span>
          </div>
        </div>

        {/* Products */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                <Package size={18} className="text-gray-500" />
              </div>
              <h2 className="text-lg font-bold text-[#1a1c3a]">Products</h2>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">{selected.length} selected</span>
            </div>
            <button
              onClick={() => setPickerOpen(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all"
            >
              <Plus size={14} /> Add Product
            </button>
          </div>

          {pickerOpen && (
            <div className="mb-4 border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500">Your products ({sellerProducts.length})</div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {sellerProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">
                    No products yet. <Link href="/seller/products/new" className="text-emerald-600 font-bold">Create one first</Link>.
                  </div>
                ) : sellerProducts.map(p => {
                  const already = !!selected.find(s => s.product_id === p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      disabled={already}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                        already ? 'bg-gray-50 opacity-50 cursor-not-allowed' : 'hover:bg-emerald-50/50'
                      )}
                    >
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package size={14} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#1a1c3a] truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                      </div>
                      {already && <span className="text-[10px] font-bold text-emerald-600">ADDED</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selected.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl py-12 text-center">
              <Package size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No products added yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[11px] font-bold text-gray-400 uppercase border-b border-gray-100">
                    <th className="py-2 px-3">ID</th>
                    <th className="py-2 px-3">Product Name</th>
                    <th className="py-2 px-3">Price (KES)</th>
                    <th className="py-2 px-3">Quantity</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selected.map(r => (
                    <tr key={r.product_id}>
                      <td className="py-3 px-3 text-xs font-mono text-gray-500">{r.sku || '—'}</td>
                      <td className="py-3 px-3 text-sm font-semibold text-[#1a1c3a]">{r.name}</td>
                      <td className="py-3 px-3">
                        <input
                          type="number" min="0"
                          value={r.price}
                          onChange={e => updateRow(r.product_id, 'price', parseFloat(e.target.value) || 0)}
                          className="w-28 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number" min="1"
                          value={r.quantity}
                          onChange={e => updateRow(r.product_id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-3 text-right text-sm font-bold text-emerald-600">
                        {(r.price * r.quantity).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => removeRow(r.product_id)}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td colSpan={3} className="py-3 px-3 text-xs font-bold text-gray-500">
                      {totalUnits} unit(s) across {selected.length} product(s)
                    </td>
                    <td colSpan={3} className="py-3 px-3 text-right text-sm font-bold text-[#1a1c3a]">
                      Total: <span className="text-emerald-600">KES {totalCost.toLocaleString()}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            After saving, the expedition will be <strong className="text-orange-500">pending</strong> until admin confirms stock receipt.
          </p>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex items-center gap-2 px-10 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-200/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Save size={15} /> Save</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Field components ── */
const baseInput =
  'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-[#1a1c3a] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all'

function Label({ label, required }: { label: string; required?: boolean }) {
  return <label className="block text-sm font-semibold text-[#1a1c3a] mb-2">{label}{required && <span className="text-emerald-500 ml-0.5">*</span>}</label>
}

function FieldText({ label, required, value, onChange }: { label: string; required?: boolean; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label label={label} required={required} />
      <input value={value} onChange={e => onChange(e.target.value)} className={baseInput} />
    </div>
  )
}

function FieldNumber({ label, required, value, onChange }: { label: string; required?: boolean; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label label={label} required={required} />
      <input type="number" min="1" value={value} onChange={e => onChange(e.target.value)} className={baseInput} />
    </div>
  )
}

function FieldDate({ label, required, value, onChange }: { label: string; required?: boolean; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label label={label} required={required} />
      <input type="datetime-local" value={value} onChange={e => onChange(e.target.value)} className={baseInput} />
    </div>
  )
}

function FieldSelect({ label, required, value, onChange, options, placeholder }: { label: string; required?: boolean; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <div>
      <Label label={label} required={required} />
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)} className={cn(baseInput, 'appearance-none pr-10')}>
          <option value="">{placeholder || 'Select…'}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}
