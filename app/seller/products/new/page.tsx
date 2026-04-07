'use client'

import { useState, useRef, ReactNode, DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import { ExpeditionOrigin } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import {
  Package, ArrowLeft, Save, ChevronDown, DollarSign, Image as ImageIcon,
  CheckCircle, Copy, Check, ArrowRight, UploadCloud, X,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

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

/* ──────────────────────────────────────────────
   Floating-label field wrapper (matches new order)
   ────────────────────────────────────────────── */
function FloatField({ label, required, error, children }: {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <div className={cn(
        'relative rounded-xl border bg-white transition-all focus-within:border-[#f4991a] focus-within:ring-2 focus-within:ring-[#f4991a]/15',
        error ? 'border-red-300' : 'border-gray-300'
      )}>
        <label className="absolute -top-2 left-3 px-1.5 bg-white text-[11px] font-semibold text-gray-500">
          {label}{required && <span className="text-[#f4991a] ml-0.5">*</span>}
        </label>
        {children}
      </div>
      {error && <p className="text-xs text-red-400 mt-1 ml-1">{error}</p>}
    </div>
  )
}

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */
export default function SellerNewProductPage() {
  const router = useRouter()
  const { t } = useT()

  const [origin, setOrigin]               = useState<ExpeditionOrigin>('China')
  const [category, setCategory]           = useState('')
  const [name, setName]                   = useState('')
  const [sku, setSku]                     = useState('')
  const [description, setDescription]     = useState('')
  const [buyingPrice, setBuyingPrice]     = useState('')
  const [sellingPrice, setSellingPrice]   = useState('')
  const [discountPrice, setDiscountPrice] = useState('')
  const [stock, setStock]                 = useState('')
  const [imageData, setImageData]         = useState<string | null>(null)
  const [imageName, setImageName]         = useState<string | null>(null)
  const [dragOver, setDragOver]           = useState(false)
  const [errors, setErrors]               = useState<Record<string, string>>({})
  const [saving, setSaving]               = useState(false)
  const [generatedId, setGeneratedId]     = useState<string | null>(null)
  const [copied, setCopied]               = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const margin = buyingPrice && sellingPrice
    ? ((parseFloat(sellingPrice) - parseFloat(buyingPrice)) / parseFloat(sellingPrice) * 100).toFixed(1)
    : null

  const handleFile = (file: File | null) => {
    if (!file) return
    if (file.size > 500 * 1024) {
      alert('File is too large. Max 500KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      setImageData(e.target?.result as string)
      setImageName(file.name)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0])
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim())                                    e.name         = t('np_required')
    if (!sku.trim())                                     e.sku          = t('np_required')
    if (!buyingPrice || parseFloat(buyingPrice) <= 0)    e.buyingPrice  = t('np_required')
    if (!sellingPrice || parseFloat(sellingPrice) <= 0)  e.sellingPrice = t('np_required')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
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
      name,
      sku,
      category,
      description: description || null,
      origin,
      buying_price: parseFloat(buyingPrice),
      selling_price: parseFloat(sellingPrice),
      discount_price: discountPrice ? parseFloat(discountPrice) : null,
      stock: stockNum,
      image_url: imageData,
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

  /* ── Success screen ── */
  if (generatedId) {
    return (
      <div className="min-h-screen bg-[#f5f7fa]">
        <Header title={t('np_title')} subtitle="" role="seller" />
        <div className="p-6 max-w-md">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1a1c3a]">{t('np_created_title')}</h2>
              <p className="text-sm text-gray-400 mt-1">{t('np_created_sub')}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 mb-2">{t('np_product_id')}</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-bold text-[#1a1c3a] font-mono tracking-wider">{generatedId}</span>
                <button onClick={copyId} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#f4991a] hover:border-[#f4991a] transition-all">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">{t('np_save_id_hint')}</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-left">
              <p className="text-xs font-semibold text-[#f4991a] mb-0.5">{name}</p>
              <p className="text-xs text-gray-500">SKU: {sku} · KES {parseFloat(sellingPrice).toLocaleString()} · {stock || '0'} units</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setGeneratedId(null)
                  setName(''); setSku(''); setBuyingPrice(''); setSellingPrice('')
                  setDiscountPrice(''); setStock(''); setDescription('')
                  setImageData(null); setImageName(null)
                }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              >
                {t('np_add_another')}
              </button>
              <button
                onClick={() => router.push('/seller/products')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#f4991a] hover:bg-orange-500 text-white text-sm font-semibold transition-all"
              >
                {t('np_view_products')} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Form ── */
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Header title={t('np_title')} subtitle="" role="seller" />

      <div className="px-6 pt-6 pb-10 space-y-6">

        {/* ── Top: round back + title (same as new order) ── */}
        <div className="flex items-center gap-3">
          <Link
            href="/seller/products"
            className="w-11 h-11 rounded-full bg-[#f4991a] hover:bg-orange-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/30 transition-all"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-[#f4991a]">{t('np_title')}</h1>
        </div>

        {/* ── Two column: Product Info | Pricing & Stock ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Product Information ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                <Package size={18} className="text-gray-500" />
              </div>
              <h2 className="text-lg font-bold text-[#1a1c3a]">{t('np_product_info')}</h2>
            </div>

            <div className="space-y-5">
              {/* Name */}
              <FloatField label={t('np_name')} required error={errors.name}>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
                  placeholder={t('np_name_ph')}
                  className="w-full px-3.5 pt-4 pb-3 bg-transparent text-sm focus:outline-none placeholder:text-gray-300"
                />
              </FloatField>

              {/* SKU */}
              <FloatField label={t('np_sku')} required error={errors.sku}>
                <input
                  value={sku}
                  onChange={e => { setSku(e.target.value); setErrors(p => ({ ...p, sku: '' })) }}
                  placeholder={t('np_sku_ph')}
                  className="w-full px-3.5 pt-4 pb-3 bg-transparent text-sm font-mono focus:outline-none placeholder:text-gray-300"
                />
              </FloatField>

              {/* Category */}
              <FloatField label={t('np_category')}>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full appearance-none px-3.5 pt-4 pb-3 bg-transparent text-sm text-[#1a1c3a] focus:outline-none"
                >
                  <option value="">{t('np_select_category')}</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </FloatField>

              {/* Origin */}
              <FloatField label={t('np_origin')}>
                <select
                  value={origin}
                  onChange={e => setOrigin(e.target.value as ExpeditionOrigin)}
                  className="w-full appearance-none px-3.5 pt-4 pb-3 bg-transparent text-sm text-[#1a1c3a] font-semibold focus:outline-none"
                >
                  {origins.map(o => (
                    <option key={o.value} value={o.value}>{o.flag} {o.value}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </FloatField>

              {/* Description */}
              <FloatField label={t('np_description')}>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t('np_description_ph')}
                  rows={3}
                  className="w-full px-3.5 pt-4 pb-3 bg-transparent text-sm focus:outline-none resize-none placeholder:text-gray-300"
                />
              </FloatField>
            </div>
          </div>

          {/* ── Pricing & Stock ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                <DollarSign size={18} className="text-gray-500" />
              </div>
              <h2 className="text-lg font-bold text-[#1a1c3a]">{t('np_pricing_stock')}</h2>
            </div>

            <div className="space-y-5">
              {/* Buying Price */}
              <FloatField label={t('np_buying_price')} required error={errors.buyingPrice}>
                <input
                  type="number" min="0"
                  value={buyingPrice}
                  onChange={e => { setBuyingPrice(e.target.value); setErrors(p => ({ ...p, buyingPrice: '' })) }}
                  placeholder="0"
                  className="w-full pl-3.5 pr-14 pt-4 pb-3 bg-transparent text-sm focus:outline-none placeholder:text-gray-300"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">KES</span>
              </FloatField>

              {/* Selling Price */}
              <FloatField label={t('np_selling_price')} required error={errors.sellingPrice}>
                <input
                  type="number" min="0"
                  value={sellingPrice}
                  onChange={e => { setSellingPrice(e.target.value); setErrors(p => ({ ...p, sellingPrice: '' })) }}
                  placeholder="0"
                  className="w-full pl-3.5 pr-14 pt-4 pb-3 bg-transparent text-sm focus:outline-none placeholder:text-gray-300"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">KES</span>
              </FloatField>

              {/* Discount Price */}
              <FloatField label={t('np_discount_price')}>
                <input
                  type="number" min="0"
                  value={discountPrice}
                  onChange={e => setDiscountPrice(e.target.value)}
                  placeholder="0"
                  className="w-full pl-3.5 pr-14 pt-4 pb-3 bg-transparent text-sm focus:outline-none placeholder:text-gray-300"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">KES</span>
              </FloatField>

              {/* Stock + Margin */}
              <div className="grid grid-cols-2 gap-4">
                <FloatField label={t('np_stock_qty')}>
                  <input
                    type="number" min="0"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 pt-4 pb-3 bg-transparent text-sm focus:outline-none placeholder:text-gray-300"
                  />
                </FloatField>
                <div>
                  <div className={cn(
                    'relative rounded-xl border-2 transition-all',
                    margin === null ? 'bg-gray-50 border-gray-100' :
                    parseFloat(margin) >= 30 ? 'bg-emerald-50 border-emerald-200' :
                    parseFloat(margin) >= 10 ? 'bg-yellow-50 border-yellow-200' :
                    'bg-red-50 border-red-200'
                  )}>
                    <label className="absolute -top-2 left-3 px-1.5 bg-white text-[11px] font-semibold text-gray-500">{t('np_margin')}</label>
                    <div className={cn(
                      'px-3.5 pt-4 pb-3 text-sm font-bold text-center',
                      margin === null ? 'text-gray-300' :
                      parseFloat(margin) >= 30 ? 'text-emerald-700' :
                      parseFloat(margin) >= 10 ? 'text-yellow-700' :
                      'text-red-600'
                    )}>
                      {margin !== null ? `${margin}%` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Picture (full-width upload area) ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
              <ImageIcon size={18} className="text-gray-500" />
            </div>
            <h2 className="text-lg font-bold text-[#1a1c3a]">{t('np_main_picture')}</h2>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            onChange={e => handleFile(e.target.files?.[0] || null)}
            className="hidden"
          />

          {imageData ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageData} alt="Preview" className="w-48 h-48 object-cover rounded-2xl border border-gray-200" />
              <button
                type="button"
                onClick={() => { setImageData(null); setImageName(null) }}
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all"
                title={t('np_remove_image')}
              >
                <X size={14} />
              </button>
              {imageName && (
                <p className="text-xs text-gray-400 mt-2 text-center max-w-[12rem] truncate">{imageName}</p>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-2xl py-12 flex flex-col items-center justify-center cursor-pointer transition-all',
                dragOver ? 'border-[#f4991a] bg-orange-50/50' : 'border-gray-200 hover:border-[#f4991a] hover:bg-orange-50/30'
              )}
            >
              <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                <UploadCloud size={22} className="text-gray-400" />
              </div>
              <p className="text-sm font-bold text-[#1a1c3a]">{t('np_click_upload')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('np_file_types')}</p>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                className="mt-5 px-6 py-2.5 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-sm shadow-orange-500/30 transition-all"
              >
                {t('np_browse_files')}
              </button>
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/seller/products"
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
          >
            <ArrowLeft size={15} /> {t('cancel')}
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#f4991a] hover:bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-200/60 disabled:opacity-70 transition-all"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Save size={15} /> {t('np_save_product')}</>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
