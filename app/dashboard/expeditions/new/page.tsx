'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/dashboard/Header'
import { ExpeditionOrigin } from '@/lib/types'
import {
  PlaneTakeoff, Plus, Trash2, ArrowLeft, Save,
  Package, Globe, Truck, DollarSign, FileText,
  ChevronDown, CheckCircle, AlertCircle
} from 'lucide-react'

interface ProductRow {
  id: string
  name: string
  sku: string
  quantity: string
  unitCost: string
  sellerName: string
}

const origins: { value: ExpeditionOrigin; label: string; flag: string; cities: string[] }[] = [
  { value: 'China',  label: 'China',  flag: '🇨🇳', cities: ['Guangzhou', 'Shenzhen', 'Yiwu', 'Shanghai', 'Beijing'] },
  { value: 'Dubai',  label: 'Dubai',  flag: '🇦🇪', cities: ['Dubai', 'Jebel Ali', 'Abu Dhabi'] },
  { value: 'Turkey', label: 'Turkey', flag: '🇹🇷', cities: ['Istanbul', 'Bursa', 'Izmir'] },
  { value: 'India',  label: 'India',  flag: '🇮🇳', cities: ['Mumbai', 'Delhi', 'Surat'] },
  { value: 'Local',  label: 'Local',  flag: '🇰🇪', cities: ['Nairobi', 'Mombasa'] },
]

const carriers = [
  'DHL Express', 'FedEx', 'Maersk', 'MSC', 'Emirates SkyCargo',
  'Kenya Airways Cargo', 'Ethiopian Airlines Cargo', 'CMA CGM', 'Other',
]

export default function NewExpeditionPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [origin, setOrigin] = useState<ExpeditionOrigin>('China')
  const [originCity, setOriginCity] = useState('Guangzhou')
  const [carrier, setCarrier] = useState('DHL Express')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [estimatedArrival, setEstimatedArrival] = useState('')
  const [shippingCost, setShippingCost] = useState('')
  const [customsFee, setCustomsFee] = useState('')
  const [notes, setNotes] = useState('')
  const [products, setProducts] = useState<ProductRow[]>([
    { id: '1', name: '', sku: '', quantity: '', unitCost: '', sellerName: '' },
  ])

  const selectedOrigin = origins.find(o => o.value === origin)!

  const addProduct = () => {
    setProducts([...products, { id: Date.now().toString(), name: '', sku: '', quantity: '', unitCost: '', sellerName: '' }])
  }

  const removeProduct = (id: string) => {
    if (products.length === 1) return
    setProducts(products.filter(p => p.id !== id))
  }

  const updateProduct = (id: string, field: keyof ProductRow, value: string) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const totalItems = products.reduce((a, p) => a + (parseInt(p.quantity) || 0), 0)
  const totalGoodsCost = products.reduce((a, p) => a + (parseFloat(p.unitCost) || 0) * (parseInt(p.quantity) || 0), 0)
  const totalLanded = totalGoodsCost + (parseFloat(shippingCost) || 0) + (parseFloat(customsFee) || 0)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => router.push('/dashboard/expeditions'), 1200)
  }

  return (
    <div className="min-h-screen">
      <Header title="New Expedition" subtitle="Create a new sourcing expedition" />

      <div className="p-6 max-w-4xl">
        {/* Back */}
        <Link
          href="/dashboard/expeditions"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a1c3a] mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Expeditions
        </Link>

        <div className="space-y-6">
          {/* Origin & Shipping */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Globe size={18} className="text-[#f4991a]" />
              <h2 className="text-base font-bold text-[#1a1c3a]">Origin & Shipping Info</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Origin country */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Origin Country *</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {origins.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => { setOrigin(o.value); setOriginCity(o.cities[0]) }}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs font-semibold ${
                        origin === o.value
                          ? 'border-[#f4991a] bg-orange-50 text-[#f4991a]'
                          : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-xl">{o.flag}</span>
                      <span>{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Origin city */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Origin City *</label>
                <div className="relative">
                  <select
                    value={originCity}
                    onChange={e => setOriginCity(e.target.value)}
                    className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] bg-white pr-10"
                  >
                    {selectedOrigin.cities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <label className="block text-xs font-semibold text-gray-500 mb-1.5 mt-3">Carrier *</label>
                <div className="relative">
                  <select
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] bg-white pr-10"
                  >
                    {carriers.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Tracking */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  placeholder="e.g. CN-AIR-88123456"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] font-mono"
                />
              </div>

              {/* ETA */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Estimated Arrival *</label>
                <input
                  type="date"
                  value={estimatedArrival}
                  onChange={e => setEstimatedArrival(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                />
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-[#f4991a]" />
                <h2 className="text-base font-bold text-[#1a1c3a]">Products</h2>
                <span className="text-xs bg-orange-50 text-[#f4991a] font-semibold px-2 py-0.5 rounded-full">
                  {products.length} item{products.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={addProduct}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#f4991a] hover:text-orange-600 transition-colors"
              >
                <Plus size={14} /> Add Product
              </button>
            </div>

            {/* Header row */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-1 mb-2">
              {['Product Name', 'SKU', 'Qty', 'Unit Cost (KES)', 'Seller'].map((h, i) => (
                <div key={h} className={`text-xs font-semibold text-gray-400 uppercase tracking-wide ${
                  i === 0 ? 'col-span-4' : i === 4 ? 'col-span-3' : 'col-span-1'
                }`}>
                  {h}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {products.map((product, i) => (
                <div key={product.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 group">
                  {/* Name */}
                  <div className="md:col-span-4">
                    <label className="md:hidden text-xs font-semibold text-gray-500 mb-1 block">Product Name</label>
                    <input
                      type="text"
                      value={product.name}
                      onChange={e => updateProduct(product.id, 'name', e.target.value)}
                      placeholder="e.g. Wireless Earbuds Pro"
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                    />
                  </div>
                  {/* SKU */}
                  <div className="md:col-span-1">
                    <label className="md:hidden text-xs font-semibold text-gray-500 mb-1 block">SKU</label>
                    <input
                      type="text"
                      value={product.sku}
                      onChange={e => updateProduct(product.id, 'sku', e.target.value)}
                      placeholder="SKU"
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] font-mono"
                    />
                  </div>
                  {/* Qty */}
                  <div className="md:col-span-1">
                    <label className="md:hidden text-xs font-semibold text-gray-500 mb-1 block">Qty</label>
                    <input
                      type="number"
                      value={product.quantity}
                      onChange={e => updateProduct(product.id, 'quantity', e.target.value)}
                      placeholder="0"
                      min="1"
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                    />
                  </div>
                  {/* Unit Cost */}
                  <div className="md:col-span-2">
                    <label className="md:hidden text-xs font-semibold text-gray-500 mb-1 block">Unit Cost (KES)</label>
                    <input
                      type="number"
                      value={product.unitCost}
                      onChange={e => updateProduct(product.id, 'unitCost', e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                    />
                  </div>
                  {/* Seller */}
                  <div className="md:col-span-3">
                    <label className="md:hidden text-xs font-semibold text-gray-500 mb-1 block">Seller</label>
                    <input
                      type="text"
                      value={product.sellerName}
                      onChange={e => updateProduct(product.id, 'sellerName', e.target.value)}
                      placeholder="Seller name"
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                    />
                  </div>
                  {/* Remove */}
                  <div className="md:col-span-1 flex items-center justify-end md:justify-center">
                    {product.quantity && product.unitCost ? (
                      <div className="text-xs font-semibold text-[#f4991a] text-right mr-2 hidden md:block">
                        KES {((parseFloat(product.unitCost) || 0) * (parseInt(product.quantity) || 0)).toLocaleString()}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      disabled={products.length === 1}
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addProduct}
              className="mt-3 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-[#f4991a]/40 hover:text-[#f4991a] transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add Another Product
            </button>
          </div>

          {/* Costs */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign size={18} className="text-[#f4991a]" />
              <h2 className="text-base font-bold text-[#1a1c3a]">Shipping & Customs Fees</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Shipping Cost (KES)</label>
                <input
                  type="number"
                  value={shippingCost}
                  onChange={e => setShippingCost(e.target.value)}
                  placeholder="e.g. 28000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Customs & Handling Fees (KES)</label>
                <input
                  type="number"
                  value={customsFee}
                  onChange={e => setCustomsFee(e.target.value)}
                  placeholder="e.g. 15200"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                />
              </div>
            </div>

            {/* Cost Summary */}
            {totalGoodsCost > 0 && (
              <div className="mt-4 bg-gradient-to-r from-[#1a1c3a] to-[#252750] rounded-xl p-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  {[
                    { label: 'Goods', value: `KES ${totalGoodsCost.toLocaleString()}` },
                    { label: 'Shipping', value: `KES ${(parseFloat(shippingCost) || 0).toLocaleString()}` },
                    { label: 'Customs', value: `KES ${(parseFloat(customsFee) || 0).toLocaleString()}` },
                    { label: 'Total Landed', value: `KES ${totalLanded.toLocaleString()}` },
                  ].map((s, i) => (
                    <div key={s.label}>
                      <div className={`font-bold text-sm ${i === 3 ? 'text-[#f4991a]' : 'text-white'}`}>{s.value}</div>
                      <div className="text-white/40 text-xs mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10 text-white/50 text-xs">
                  <Package size={12} />
                  <span>{totalItems} total units across {products.filter(p => p.name).length} product(s)</span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={18} className="text-[#f4991a]" />
              <h2 className="text-base font-bold text-[#1a1c3a]">Notes</h2>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes about this expedition (e.g. customs requirements, fragile items, supplier contact)..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/expeditions"
              className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
            >
              <ArrowLeft size={16} /> Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl text-white text-sm font-semibold transition-all ${
                saved
                  ? 'bg-emerald-500 scale-105'
                  : 'bg-[#f4991a] hover:bg-[#f8b44a] hover:scale-105 shadow-lg shadow-orange-200'
              } disabled:opacity-70`}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <><CheckCircle size={16} /> Saved!</>
              ) : (
                <><Save size={16} /> Create Expedition</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
