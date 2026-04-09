'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { getOrderFlags } from '@/lib/orderFlags'
import {
  User, ArrowLeft, Save, CheckCircle,
  Plus, Trash2, ChevronDown, ShoppingCart, Package,
  Copy, Check, ArrowRight, Search, AlertTriangle, AlertCircle, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

/* Only Kenya is open for now */
const countries = [
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', cities: ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Malindi','Kitale','Garissa','Nyeri'] },
]

const countryOriginMap: Record<string, string[]> = {
  KE: ['China', 'Dubai', 'Turkey', 'India', 'Local'],
}

interface SellerProduct { id: string; name: string; sku: string; origin: string; stock: number; selling_price: number; image_url?: string | null; description?: string | null }

interface ProductRow {
  id: string
  productId: string
  name: string
  sku: string
  quantity: string
  unitPrice: string
}

function generateOrderId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = 'ORD-'
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

/* ──────────────────────────────────────────────
   Floating-label field wrapper (mirrors screenshot)
   ────────────────────────────────────────────── */
function FloatField({ label, required, error, children }: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
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
   Add Products modal (matches screenshot)
   ────────────────────────────────────────────── */
function ProductModal({ open, onClose, countryCode, alreadySelected, onConfirm, sellerProducts }: {
  open: boolean
  onClose: () => void
  countryCode: string
  alreadySelected: string[]
  onConfirm: (picks: { id: string; name: string; sku: string; price: number }[]) => void
  sellerProducts: SellerProduct[]
}) {
  const { t } = useT()
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())

  // Reset picks each time the modal opens
  useEffect(() => {
    if (open) { setPicked(new Set()); setSearch('') }
  }, [open])

  const available = sellerProducts.filter(p =>
    !alreadySelected.includes(p.id) &&
    (search === '' ||
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase()))
  )

  const toggle = (id: string) => {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirm = () => {
    const picks = available
      .filter(p => picked.has(p.id))
      .map(p => ({ id: p.id, name: p.name, sku: p.sku, price: p.selling_price || 0 }))
    onConfirm(picks)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#f4991a] text-white">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Plus size={16} /> {t('no_add_products')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="relative">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('search')}
              className="w-full pl-4 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/15 focus:border-[#f4991a] transition-all"
            />
            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#f4991a]" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {available.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <Package size={20} className="text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-500">
                {sellerProducts.length === 0
                  ? 'No products yet — create one in Products → New Product'
                  : 'No products match your search'}
              </p>
              <p className="text-[10px] text-gray-300 mt-2">Loaded: {sellerProducts.length} product(s)</p>
            </div>
          ) : available.map(p => {
            const isPicked = picked.has(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-3 border rounded-xl text-left transition-all',
                  isPicked
                    ? 'border-[#f4991a] bg-orange-50/50 ring-2 ring-[#f4991a]/15'
                    : 'border-gray-200 hover:border-[#f4991a]/60 hover:bg-orange-50/30'
                )}
              >
                {/* Checkbox */}
                <div className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  isPicked ? 'bg-[#f4991a] border-[#f4991a]' : 'border-gray-300'
                )}>
                  {isPicked && <Check size={13} className="text-white" />}
                </div>

                {/* Image */}
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-50 to-blue-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={22} className="text-gray-300" />
                  )}
                </div>

                {/* Name + sub */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1a1c3a] truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{p.description || p.name}</p>
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-[#f4991a]">KES {(p.selling_price || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Stock: {p.stock}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-400 hover:bg-gray-500 text-white text-sm font-bold rounded-xl transition-all"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={picked.size === 0}
            className="px-6 py-2.5 bg-[#f4991a] hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-sm shadow-orange-500/30 transition-all"
          >
            {t('no_confirm')}{picked.size > 0 && ` (${picked.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */
export default function SellerNewOrderPage() {
  const router = useRouter()
  const { t } = useT()

  const [country, setCountry] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [orderSource, setOrderSource] = useState('')
  const [rows, setRows] = useState<ProductRow[]>([])
  const [saving, setSaving] = useState(false)
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    let sellerId: string | null = null
    try {
      const stored = localStorage.getItem('shipedo_seller')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.role === 'seller') sellerId = u.id
      }
    } catch {}
    if (!sellerId) return
    supabase.from('products').select('*').eq('seller_id', sellerId).then(({ data }) => {
      setSellerProducts((data || []) as SellerProduct[])
    })
  }, [])

  const selectedCountry = countries.find(c => c.code === country) || null
  const total = rows.reduce((a, r) => a + (parseFloat(r.unitPrice) || 0) * (parseInt(r.quantity) || 0), 0)

  const addProducts = (picks: { id: string; name: string; sku: string; price: number }[]) => {
    if (picks.length === 0) return
    setRows(prev => [
      ...prev,
      ...picks.map((p, i) => ({
        id: `${Date.now()}-${i}`,
        productId: p.id,
        name: p.name,
        sku: p.sku,
        quantity: '1',
        unitPrice: String(p.price),
      })),
    ])
    setErrors(e => ({ ...e, products: '' }))
  }

  const removeRow = (id: string) => setRows(r => r.filter(x => x.id !== id))
  const updateRow = (id: string, field: keyof ProductRow, val: string) =>
    setRows(r => r.map(x => x.id !== id ? x : { ...x, [field]: val }))

  const handleCountryChange = (code: string) => {
    setCountry(code)
    setCity('')
    setRows([])
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!country)         e.country  = t('no_required')
    if (!fullName.trim()) e.fullName = t('no_required')
    if (!phone.trim())    e.phone    = t('no_required')
    if (rows.length === 0) e.products = t('no_no_products')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const copyId = () => {
    if (!generatedId) return
    navigator.clipboard.writeText(generatedId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    let sellerId: string | null = null
    let sellerName: string | null = null
    try {
      const stored = localStorage.getItem('shipedo_seller')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.role === 'seller') { sellerId = u.id; sellerName = u.name }
      }
    } catch {}
    const newId = generateOrderId()
    const items = rows.map(r => ({
      product_id: r.productId, name: r.name, sku: r.sku,
      quantity: parseInt(r.quantity) || 0, unit_price: parseFloat(r.unitPrice) || 0,
    }))
    // Round-robin assign to least-loaded active agent
    let assignedAgentId: string | null = null
    try {
      const { data: agents } = await supabase.from('agents').select('id').eq('status', 'active')
      if (agents && agents.length > 0) {
        if (agents.length === 1) {
          assignedAgentId = agents[0].id
        } else {
          const { data: pendingOrders } = await supabase
            .from('orders')
            .select('assigned_agent_id')
            .eq('status', 'pending')
            .not('assigned_agent_id', 'is', null)
          const counts = new Map<string, number>()
          agents.forEach(a => counts.set(a.id, 0))
          ;(pendingOrders || []).forEach((o: any) => {
            if (counts.has(o.assigned_agent_id)) counts.set(o.assigned_agent_id, (counts.get(o.assigned_agent_id) || 0) + 1)
          })
          let best = Infinity
          for (const [id, c] of counts.entries()) {
            if (c < best) { best = c; assignedAgentId = id }
          }
        }
      }
    } catch {}

    const { error } = await supabase.from('orders').insert({
      tracking_number: newId,
      seller_id: sellerId,
      seller_name: sellerName,
      assigned_agent_id: assignedAgentId,
      customer_name: fullName,
      customer_phone: phone,
      customer_city: city,
      customer_address: address,
      country: selectedCountry?.name ?? country,
      source: orderSource || null,
      items,
      total_amount: total,
      status: 'pending',
      payment_method: 'COD',
    })
    setSaving(false)
    if (error) {
      alert('Supabase error: ' + error.message + '\nCode: ' + (error.code || 'n/a'))
      return
    }
    setGeneratedId(newId)
  }

  /* ── Success screen ── */
  if (generatedId) {
    return (
      <div className="min-h-screen bg-[#f5f7fa]">
        <Header title={t('no_title')} subtitle="" role="seller" />
        <div className="p-6 max-w-md">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1a1c3a]">{t('no_created_title')}</h2>
              <p className="text-sm text-gray-400 mt-1">{t('no_created_sub')}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 mb-2">{t('no_order_id')}</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-bold text-[#1a1c3a] font-mono tracking-wider">{generatedId}</span>
                <button onClick={copyId} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#f4991a] hover:border-[#f4991a] transition-all">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">{t('no_id_hint')}</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-left space-y-0.5">
              <p className="text-xs font-semibold text-[#f4991a]">{fullName}</p>
              <p className="text-xs text-gray-500">{selectedCountry?.flag} {city || selectedCountry?.name}</p>
              <p className="text-xs text-gray-500">{rows.length} {t('products').toLowerCase()} · KES {total.toLocaleString()}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setGeneratedId(null); setFullName(''); setPhone(''); setCity(''); setAddress(''); setOrderSource(''); setRows([]); setErrors({}) }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              >
                {t('no_new_order')}
              </button>
              <button
                onClick={() => router.push('/seller/orders')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#f4991a] hover:bg-orange-500 text-white text-sm font-semibold transition-all"
              >
                {t('no_view_orders')} <ArrowRight size={14} />
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
      <Header title={t('no_title')} subtitle="" role="seller" />

      <div className="px-6 pt-6 pb-10 space-y-6">

        {/* ── Top: round back + title (mirrors screenshot) ── */}
        <div className="flex items-center gap-3">
          <Link
            href="/seller/orders"
            className="w-11 h-11 rounded-full bg-[#f4991a] hover:bg-orange-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/30 transition-all"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-[#f4991a]">{t('no_title')}</h1>
        </div>

        {/* ── Two column: Customer Info | Order Information ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Customer Information ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                <User size={18} className="text-gray-500" />
              </div>
              <h2 className="text-lg font-bold text-[#1a1c3a]">{t('no_customer_info')}</h2>
            </div>

            <div className="space-y-5">
              {/* Country */}
              <FloatField label={t('no_country')} required error={errors.country}>
                <select
                  value={country}
                  onChange={e => { handleCountryChange(e.target.value); setErrors(p => ({ ...p, country: '' })) }}
                  className="w-full appearance-none px-3.5 pt-4 pb-3 rounded-xl text-sm bg-transparent text-[#1a1c3a] font-semibold focus:outline-none"
                >
                  <option value="">{t('no_select_country')}</option>
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </FloatField>

              {/* Live flags */}
              {(() => {
                const flags = phone.length >= 6 ? getOrderFlags(phone, rows.map(r => r.productId), country) : []
                return flags.length > 0 ? (
                  <div className="space-y-2">
                    {flags.map(flag => (
                      <div key={flag.type} className={`flex items-start gap-2.5 p-3 rounded-xl border ${flag.bg} ${flag.border}`}>
                        <AlertTriangle size={14} className={`${flag.color} flex-shrink-0 mt-0.5`} />
                        <div>
                          <p className={`text-xs font-bold ${flag.color}`}>{flag.label}</p>
                          <p className={`text-xs mt-0.5 ${flag.color} opacity-80`}>{flag.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null
              })()}

              {/* Full Name */}
              <FloatField label={t('no_full_name')} required error={errors.fullName}>
                <input
                  value={fullName}
                  onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })) }}
                  className="w-full px-3.5 pt-4 pb-3 bg-transparent text-sm focus:outline-none"
                />
              </FloatField>

              {/* Phone */}
              <FloatField label={t('no_phone')} required error={errors.phone}>
                <input
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })) }}
                  className="w-full px-3.5 pt-4 pb-3 bg-transparent text-sm font-mono focus:outline-none"
                />
              </FloatField>

              {/* City */}
              <FloatField label={t('no_city')}>
                {selectedCountry && selectedCountry.cities.length > 0 ? (
                  <>
                    <select
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full appearance-none px-3.5 pt-4 pb-3 rounded-xl text-sm bg-transparent text-[#1a1c3a] focus:outline-none"
                    >
                      <option value="">{t('no_select_city')}</option>
                      {selectedCountry.cities.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </>
                ) : (
                  <input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder={t('no_enter_city')}
                    disabled={!country}
                    className="w-full px-3.5 pt-4 pb-3 bg-transparent text-sm focus:outline-none disabled:cursor-not-allowed"
                  />
                )}
              </FloatField>

              {/* Address */}
              <FloatField label={t('no_address')}>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 pt-4 pb-3 bg-transparent text-sm focus:outline-none resize-none"
                />
              </FloatField>
            </div>
          </div>

          {/* ── Order Information ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                <ShoppingCart size={18} className="text-gray-500" />
              </div>
              <h2 className="text-lg font-bold text-[#1a1c3a]">{t('no_order_info')}</h2>
            </div>

            <div className="space-y-5">
              <FloatField label={t('no_order_source')}>
                <textarea
                  value={orderSource}
                  onChange={e => setOrderSource(e.target.value)}
                  placeholder={t('no_order_source_ph')}
                  rows={3}
                  className="w-full px-3.5 pt-4 pb-3 bg-transparent text-sm focus:outline-none resize-none placeholder:text-gray-300"
                />
              </FloatField>
            </div>
          </div>
        </div>

        {/* ── Products section (full-width, mirrors screenshot) ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                <Package size={18} className="text-gray-500" />
              </div>
              <h2 className="text-lg font-bold text-[#1a1c3a]">{t('no_products')}</h2>
              {rows.length > 0 && (
                <span className="text-xs bg-orange-50 text-[#f4991a] font-bold px-2.5 py-0.5 rounded-full">{rows.length}</span>
              )}
            </div>
            {country && (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex items-center gap-2 px-5 py-3 bg-[#f4991a] hover:bg-orange-500 text-white text-sm font-bold rounded-xl shadow-sm shadow-orange-500/30 transition-all"
              >
                <Plus size={15} /> {t('no_select_product')}
              </button>
            )}
          </div>

          {errors.products && (
            <div className="mx-6 mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-500 flex items-center gap-2">
              <AlertCircle size={13} /> {errors.products}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto border-t border-gray-50">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5 text-left">{t('prod_name')}</th>
                  <th className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5 text-left">{t('no_unit_price')}</th>
                  <th className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5 text-center">{t('no_quantity')}</th>
                  <th className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5 text-left">{t('no_total')}</th>
                  <th className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5 text-right">{t('no_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                          {country
                            ? <Package size={20} className="text-gray-300" />
                            : <AlertCircle size={20} className="text-gray-300" />}
                        </div>
                        <p className="text-sm font-semibold text-gray-500">
                          {country ? t('no_no_products') : t('no_pick_country_first')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {country ? t('no_no_products_sub') : t('no_pick_country_sub')}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : rows.map(r => {
                  const qty = parseInt(r.quantity) || 0
                  const unit = parseFloat(r.unitPrice) || 0
                  const lineTotal = unit * qty
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      {/* Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-50 to-blue-50 border border-gray-100 flex items-center justify-center">
                            <Package size={14} className="text-[#f4991a]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#1a1c3a] truncate max-w-[260px]">{r.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{r.sku}</p>
                          </div>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="px-6 py-4">
                        <input
                          type="number" min="0"
                          value={r.unitPrice}
                          onChange={e => updateRow(r.id, 'unitPrice', e.target.value)}
                          className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/15 focus:border-[#f4991a] transition-all"
                        />
                      </td>

                      {/* Quantity stepper */}
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateRow(r.id, 'quantity', String(Math.max(1, qty - 1)))}
                            className="w-7 h-7 rounded-lg bg-[#f4991a] hover:bg-orange-500 text-white flex items-center justify-center font-bold text-sm transition-all"
                          >−</button>
                          <span className="min-w-[28px] text-center text-sm font-bold text-[#1a1c3a]">{qty}</span>
                          <button
                            type="button"
                            onClick={() => updateRow(r.id, 'quantity', String(qty + 1))}
                            className="w-7 h-7 rounded-lg bg-[#f4991a] hover:bg-orange-500 text-white flex items-center justify-center font-bold text-sm transition-all"
                          >+</button>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-rose-500">{lineTotal.toLocaleString()}</span>
                        <span className="text-[10px] text-gray-400 font-semibold ml-1">KES</span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 inline-flex items-center justify-center transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Total Price footer */}
          {rows.length > 0 && (
            <div className="flex justify-end px-6 py-4 border-t border-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('no_total_price')}:</span>
                <span className="text-xl font-bold text-[#f4991a]">{total.toLocaleString()}</span>
                <span className="text-xs font-bold text-gray-400">KES</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/seller/orders"
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
              <><Save size={15} /> {t('no_save_order')}</>
            )}
          </button>
        </div>

      </div>

      {/* ── Add Products modal ── */}
      <ProductModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        countryCode={country}
        alreadySelected={rows.map(r => r.productId)}
        onConfirm={addProducts}
        sellerProducts={sellerProducts}
      />
    </div>
  )
}
