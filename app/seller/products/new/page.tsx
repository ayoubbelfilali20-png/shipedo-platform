'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import { ExpeditionOrigin } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import {
  Package, ArrowLeft, Save,
  ChevronDown, DollarSign, Hash, Tag, Globe,
  CheckCircle, Copy, Check, ArrowRight
} from 'lucide-react'
import Link from 'next/link'

const origins: { value: ExpeditionOrigin; flag: string }[] = [
  { value: 'China',  flag: '🇨🇳' },
  { value: 'Dubai',  flag: '🇦🇪' },
  { value: 'Turkey', flag: '🇹🇷' },
  { value: 'India',  flag: '🇮🇳' },
  { value: 'Local',  flag: '🇰🇪' },
]

const categories = ['Electronics', 'Fashion', 'Beauty', 'Accessories', 'Home & Kitchen', 'Sports', 'Toys', 'Food', 'Health', 'Other']

function generateProductId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = 'PRD-'
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

export default function SellerNewProductPage() {
  const router = useRouter()
  const [origin, setOrigin] = useState<ExpeditionOrigin>('China')
  const [category, setCategory] = useState('')
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')
  const [buyingPrice, setBuyingPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [stock, setStock] = useState('')
  const [saving, setSaving] = useState(false)
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const margin = buyingPrice && sellingPrice
    ? ((parseFloat(sellingPrice) - parseFloat(buyingPrice)) / parseFloat(sellingPrice) * 100).toFixed(1)
    : null

  const handleSave = async () => {
    if (!name || !sku || !buyingPrice || !sellingPrice) return
    setSaving(true)
    let sellerId: string | null = null
    try {
      const stored = localStorage.getItem('shipedo_user')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.role === 'seller') sellerId = u.id
      }
    } catch {}
    const stockNum = parseInt(stock) || 0
    const { error } = await supabase.from('products').insert({
      name, sku, category,
      description: description || null,
      origin,
      buying_price: parseFloat(buyingPrice),
      selling_price: parseFloat(sellingPrice),
      stock: stockNum,
      status: stockNum === 0 ? 'out_of_stock' : stockNum <= 5 ? 'low_stock' : 'active',
      seller_id: sellerId,
    })
    setSaving(false)
    if (error) {
      alert('Supabase error: ' + error.message + '\nCode: ' + (error.code || 'n/a'))
      return
    }
    setGeneratedId(generateProductId())
  }

  const copyId = () => {
    if (!generatedId) return
    navigator.clipboard.writeText(generatedId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Success screen
  if (generatedId) {
    return (
      <div className="min-h-screen">
        <Header title="New Product" subtitle="Add a product to your stock" role="seller" />
        <div className="p-6 max-w-lg">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1a1c3a]">Product Created!</h2>
              <p className="text-sm text-gray-400 mt-1">Your product has been added to your catalog.</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 mb-2">PRODUCT ID</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-bold text-[#1a1c3a] font-mono tracking-wider">{generatedId}</span>
                <button
                  onClick={copyId}
                  className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#f4991a] hover:border-[#f4991a] transition-all"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Save this ID — use it when referencing this product</p>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-left">
              <p className="text-xs font-semibold text-[#f4991a] mb-0.5">{name}</p>
              <p className="text-xs text-gray-500">SKU: {sku} · Selling: KES {parseFloat(sellingPrice).toLocaleString()} · Stock: {stock || '0'} units</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setGeneratedId(null)
                  setName(''); setSku(''); setBuyingPrice(''); setSellingPrice(''); setStock(''); setDescription('')
                }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Add Another
              </button>
              <button
                onClick={() => router.push('/seller/products')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1a1c3a] text-white text-sm font-semibold hover:bg-[#252750] transition-all"
              >
                View Products <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header title="New Product" subtitle="Add a product to your stock" role="seller" />

      <div className="px-6 pt-5 pb-10 max-w-2xl space-y-5">
        {/* Back */}
        <Link href="/seller/products" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#1a1c3a] transition-colors">
          <ArrowLeft size={15} />
          Back to Products
        </Link>

        {/* Origin */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Globe size={13} /> Origin
          </h3>
          <div className="flex gap-2 flex-wrap">
            {origins.map(o => (
              <button
                key={o.value}
                onClick={() => setOrigin(o.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  origin === o.value
                    ? 'border-[#f4991a] bg-orange-50 text-[#1a1c3a]'
                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                }`}
              >
                <span className="text-lg">{o.flag}</span>
                {o.value}
              </button>
            ))}
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <Tag size={13} /> Product Info
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Product Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Wireless Earbuds Pro"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">SKU *</label>
              <input
                value={sku}
                onChange={e => setSku(e.target.value)}
                placeholder="e.g. WEP-001"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                >
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Product description..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <DollarSign size={13} /> Pricing
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Buying Price (KES) *</label>
              <input
                type="number"
                value={buyingPrice}
                onChange={e => setBuyingPrice(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Selling Price (KES) *</label>
              <input
                type="number"
                value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Margin</label>
              <div className={`px-3.5 py-2.5 rounded-xl text-sm font-bold border-2 ${
                margin === null ? 'bg-gray-50 border-gray-100 text-gray-300' :
                parseFloat(margin) >= 30 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                parseFloat(margin) >= 10 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                'bg-red-50 border-red-200 text-red-600'
              }`}>
                {margin !== null ? `${margin}%` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Stock */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Hash size={13} /> Initial Stock
          </h3>
          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantity</label>
            <input
              type="number"
              value={stock}
              onChange={e => setStock(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!name || !sku || !buyingPrice || !sellingPrice || saving}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1a1c3a] hover:bg-[#252750] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold py-3.5 rounded-xl transition-all"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Save size={15} /> Save Product</>
            )}
          </button>
          <Link
            href="/seller/products"
            className="flex items-center justify-center gap-2 border border-gray-200 text-gray-500 text-sm font-medium py-3.5 px-5 rounded-xl hover:bg-gray-50 transition-all"
          >
            <ArrowLeft size={15} />
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
