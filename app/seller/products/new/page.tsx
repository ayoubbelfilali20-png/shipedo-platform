'use client'

import { useState, useRef, useEffect, ReactNode, DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Save, Image as ImageIcon, UploadCloud, X,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function generateSku() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = 'SKU-'
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#1a1c3a] mb-2">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const inputCls =
  'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-[#1a1c3a] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all'

export default function SellerNewProductPage() {
  const router = useRouter()

  const [name, setName]               = useState('')
  const [productLink, setProductLink] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode]               = useState('')
  const [variantCode, setVariantCode] = useState('')
  const [videoLink, setVideoLink]     = useState('')
  const [sku, setSku]                 = useState('')
  const [imageData, setImageData]     = useState<string | null>(null)
  const [imageName, setImageName]     = useState<string | null>(null)
  const [dragOver, setDragOver]       = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [saving, setSaving]           = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-generate SKU on mount
  useEffect(() => { setSku(generateSku()) }, [])

  const handleFile = (file: File | null) => {
    if (!file) return
    if (file.size > 500 * 1024) { alert('File is too large. Max 500KB.'); return }
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

  const handleSave = async () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Required'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    let sellerId: string | null = null
    try {
      const stored = localStorage.getItem('shipedo_seller')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.role === 'seller') sellerId = u.id
      }
    } catch {}

    const { error } = await supabase.from('products').insert({
      name,
      sku,
      description: description || null,
      product_link: productLink || null,
      code: code || null,
      variant_code: variantCode || null,
      product_video_link: videoLink || null,
      image_url: imageData,
      status: 'active',
      seller_id: sellerId,
    })
    setSaving(false)
    if (error) {
      alert('Supabase error: ' + error.message + '\nCode: ' + (error.code || 'n/a'))
      return
    }
    router.refresh()
    router.push('/seller/products?t=' + Date.now())
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Header title="New Product" subtitle="" role="seller" />

      <div className="px-6 pt-6 pb-10 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/seller/products"
            className="w-11 h-11 rounded-full bg-[#f4991a] hover:bg-orange-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/30 transition-all"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-[#f4991a]">New Product</h1>
          <span className="ml-auto text-xs text-gray-400">Auto SKU: <span className="font-mono font-bold text-[#1a1c3a]">{sku}</span></span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

            <Field label="Name" error={errors.name}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter Name" className={inputCls} />
            </Field>

            <Field label="Product_link">
              <input value={productLink} onChange={e => setProductLink(e.target.value)} placeholder="Enter Verification Link" className={inputCls} />
            </Field>

            <Field label="Description">
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter Description" className={inputCls} />
            </Field>

            <Field label="Code">
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="Add code" className={inputCls} />
            </Field>

            <Field label="Variant Code">
              <input value={variantCode} onChange={e => setVariantCode(e.target.value)} placeholder="Enter Variant Code" className={inputCls} />
            </Field>

            <Field label="Product Video Link">
              <input value={videoLink} onChange={e => setVideoLink(e.target.value)} placeholder="Product video link" className={inputCls} />
            </Field>
          </div>

          {/* Main Picture */}
          <div className="mt-8">
            <label className="block text-sm font-semibold text-[#1a1c3a] mb-2">Main Picture</label>
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
                >
                  <X size={14} />
                </button>
                {imageName && <p className="text-xs text-gray-400 mt-2 max-w-[12rem] truncate">{imageName}</p>}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-2xl py-12 flex flex-col items-center justify-center cursor-pointer transition-all',
                  dragOver ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30'
                )}
              >
                <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                  <UploadCloud size={22} className="text-gray-400" />
                </div>
                <p className="text-sm font-bold text-[#1a1c3a]">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 500KB</p>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                  className="mt-5 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex justify-center mt-10">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-10 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-200/60 disabled:opacity-70 transition-all"
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
    </div>
  )
}
