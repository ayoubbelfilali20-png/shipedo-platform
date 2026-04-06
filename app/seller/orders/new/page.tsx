'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/dashboard/Header'
import { mockProducts } from '@/lib/data'
import { getOrderFlags } from '@/lib/orderFlags'
import {
  User, ArrowLeft, Save, CheckCircle,
  Plus, Trash2, ChevronDown, Phone, MapPin,
  Package, Copy, Check, ArrowRight, Search, Globe, AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

const countries = [
  { code: 'KE', name: 'Kenya',     flag: '🇰🇪', cities: ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Malindi','Kitale','Garissa','Nyeri'] },
  { code: 'MA', name: 'Morocco',   flag: '🇲🇦', cities: ['Casablanca','Rabat','Marrakech','Fez','Tangier','Agadir','Meknès','Oujda'] },
  { code: 'TZ', name: 'Tanzania',  flag: '🇹🇿', cities: ['Dar es Salaam','Dodoma','Mwanza','Arusha','Zanzibar City'] },
  { code: 'UG', name: 'Uganda',    flag: '🇺🇬', cities: ['Kampala','Entebbe','Gulu','Lira','Mbarara'] },
  { code: 'NG', name: 'Nigeria',   flag: '🇳🇬', cities: ['Lagos','Abuja','Kano','Ibadan','Port Harcourt','Benin City'] },
  { code: 'ZA', name: 'S. Africa', flag: '🇿🇦', cities: ['Johannesburg','Cape Town','Durban','Pretoria','Port Elizabeth'] },
  { code: 'ET', name: 'Ethiopia',  flag: '🇪🇹', cities: ['Addis Ababa','Dire Dawa','Mekelle','Adama'] },
  { code: 'AE', name: 'UAE',       flag: '🇦🇪', cities: ['Dubai','Abu Dhabi','Sharjah','Ajman'] },
  { code: 'FR', name: 'France',    flag: '🇫🇷', cities: ['Paris','Lyon','Marseille','Toulouse','Nice'] },
  { code: 'OTHER', name: 'Other',  flag: '🌍', cities: [] },
]

const countryOriginMap: Record<string, string[]> = {
  KE:    ['China', 'Dubai', 'Turkey', 'India', 'Local'],
  MA:    ['China', 'Dubai', 'Turkey', 'Local'],
  TZ:    ['China', 'Dubai', 'Local'],
  UG:    ['China', 'Dubai', 'Local'],
  NG:    ['China', 'Dubai', 'Turkey', 'India', 'Local'],
  ZA:    ['China', 'Dubai', 'Local'],
  ET:    ['China', 'Dubai', 'Local'],
  AE:    ['Dubai', 'China', 'India'],
  FR:    ['China', 'Turkey', 'Local'],
  OTHER: ['China', 'Dubai', 'Turkey', 'India', 'Local'],
}

// Seller's own products only
const sellerProducts = mockProducts.filter(p => p.sellerId === 'sel-001')

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

function CountrySlider({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="relative">
      <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all text-[#1a1c3a] font-semibold"
      >
        {countries.map(c => (
          <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

function ProductSelector({ countryCode, selected, onAdd }: {
  countryCode: string
  selected: string[]
  onAdd: (p: { id: string; name: string; sku: string; price: number }) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const allowedOrigins = countryOriginMap[countryCode] ?? countryOriginMap.OTHER
  const available = sellerProducts.filter(p =>
    allowedOrigins.includes(p.origin) &&
    p.stock > 0 &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-[#f4991a]/40 hover:border-[#f4991a] rounded-xl text-sm text-[#f4991a] font-semibold transition-all bg-orange-50/30 hover:bg-orange-50"
      >
        <Plus size={14} />
        Select product
        <ChevronDown size={13} className={cn('ml-auto transition-transform text-[#f4991a]/60', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl z-30 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search your products..."
                className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#f4991a] transition-all"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {available.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                {sellerProducts.length === 0
                  ? 'You have no products yet'
                  : 'No products available for this country'}
              </div>
            ) : available.map(p => {
              const alreadyAdded = selected.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { if (!alreadyAdded) { onAdd({ id: p.id, name: p.name, sku: p.sku, price: p.sellingPrice }); setOpen(false); setSearch('') } }}
                  disabled={alreadyAdded}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-0',
                    alreadyAdded ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'hover:bg-orange-50/40'
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                    <Package size={13} className="text-[#f4991a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1a1c3a] truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{p.sku} · {p.origin} · Stock: {p.stock}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-[#f4991a]">KES {p.sellingPrice.toLocaleString()}</p>
                    {alreadyAdded && <p className="text-[10px] text-gray-400">Added</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SellerNewOrderPage() {
  const router = useRouter()

  const [country, setCountry] = useState('KE')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [rows, setRows] = useState<ProductRow[]>([])
  const [saving, setSaving] = useState(false)
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedCountry = countries.find(c => c.code === country)!
  const total = rows.reduce((a, r) => a + (parseFloat(r.unitPrice) || 0) * (parseInt(r.quantity) || 0), 0)

  const addProduct = (p: { id: string; name: string; sku: string; price: number }) => {
    setRows(prev => [...prev, { id: Date.now().toString(), productId: p.id, name: p.name, sku: p.sku, quantity: '1', unitPrice: String(p.price) }])
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
    if (!fullName.trim()) e.fullName = 'Required'
    if (!phone.trim()) e.phone = 'Required'
    if (rows.length === 0) e.products = 'Add at least one product'
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
    await new Promise(r => setTimeout(r, 900))
    setSaving(false)
    setGeneratedId(generateOrderId())
  }

  if (generatedId) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <Header title="New Order" subtitle="Create a new customer order" role="seller" />
        <div className="p-6 max-w-md">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1a1c3a]">Order Created!</h2>
              <p className="text-sm text-gray-400 mt-1">The order has been registered successfully.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 mb-2">ORDER ID</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-bold text-[#1a1c3a] font-mono tracking-wider">{generatedId}</span>
                <button onClick={copyId} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#f4991a] hover:border-[#f4991a] transition-all">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Use this ID to track and reference this order</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-left space-y-0.5">
              <p className="text-xs font-semibold text-[#f4991a]">{fullName}</p>
              <p className="text-xs text-gray-500">{selectedCountry.flag} {city || selectedCountry.name}</p>
              <p className="text-xs text-gray-500">{rows.length} product(s) · KES {total.toLocaleString()}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setGeneratedId(null); setFullName(''); setPhone(''); setCity(''); setAddress(''); setRows([]); setErrors({}) }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              >
                New Order
              </button>
              <button
                onClick={() => router.push('/seller/orders')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1a1c3a] text-white text-sm font-semibold hover:bg-[#252750] transition-all"
              >
                View Orders <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header title="New Order" subtitle="Create a new customer order" role="seller" />

      <div className="p-6 max-w-2xl">
        <Link href="/seller/orders" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#1a1c3a] mb-5 transition-colors">
          <ArrowLeft size={15} /> Back to Orders
        </Link>

        <div className="space-y-4">

          {/* Customer Information */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 bg-gray-50/50">
              <div className="w-7 h-7 bg-[#f4991a]/10 rounded-lg flex items-center justify-center">
                <User size={14} className="text-[#f4991a]" />
              </div>
              <h2 className="text-sm font-bold text-[#1a1c3a]">Customer Information</h2>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Country</label>
                <CountrySlider value={country} onChange={handleCountryChange} />
              </div>

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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      value={fullName}
                      onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })) }}
                      placeholder="e.g. James Mwangi"
                      className={cn('w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all', errors.fullName ? 'border-red-300' : 'border-gray-200')}
                    />
                  </div>
                  {errors.fullName && <p className="text-xs text-red-400 mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })) }}
                      placeholder="+254 712 345 678"
                      className={cn('w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all', errors.phone ? 'border-red-300' : 'border-gray-200')}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">City</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 z-10" />
                    {selectedCountry.cities.length > 0 ? (
                      <>
                        <select
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          className="w-full appearance-none pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all text-[#1a1c3a]"
                        >
                          <option value="">Select city...</option>
                          {selectedCountry.cities.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </>
                    ) : (
                      <input
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="Enter city..."
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Address</label>
                  <input
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Street, neighbourhood..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 bg-gray-50/50">
              <div className="w-7 h-7 bg-[#f4991a]/10 rounded-lg flex items-center justify-center">
                <Package size={14} className="text-[#f4991a]" />
              </div>
              <h2 className="text-sm font-bold text-[#1a1c3a]">Products</h2>
              {rows.length > 0 && (
                <span className="text-xs bg-orange-50 text-[#f4991a] font-semibold px-2 py-0.5 rounded-full">{rows.length}</span>
              )}
            </div>
            <div className="p-5 space-y-3">
              {errors.products && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-500">{errors.products}</div>
              )}

              {rows.length > 0 && (
                <div className="space-y-2">
                  {rows.map(r => {
                    const lineTotal = (parseFloat(r.unitPrice) || 0) * (parseInt(r.quantity) || 0)
                    return (
                      <div key={r.id} className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                            <Package size={12} className="text-[#f4991a]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#1a1c3a] truncate">{r.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{r.sku}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRow(r.id)}
                            className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-all flex-shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-400 mb-1">Quantity</label>
                            <input
                              type="number" min="1"
                              value={r.quantity}
                              onChange={e => updateRow(r.id, 'quantity', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-400 mb-1">Unit Price</label>
                            <input
                              type="number" min="0"
                              value={r.unitPrice}
                              onChange={e => updateRow(r.id, 'unitPrice', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all bg-white"
                            />
                          </div>
                        </div>
                        {lineTotal > 0 && (
                          <div className="mt-2 text-right text-xs font-bold text-[#f4991a]">
                            = KES {lineTotal.toLocaleString()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <ProductSelector
                countryCode={country}
                selected={rows.map(r => r.productId)}
                onAdd={addProduct}
              />

              {total > 0 && (
                <div className="flex justify-end">
                  <div className="flex items-center gap-3 bg-[#1a1c3a] rounded-xl px-5 py-2.5">
                    <span className="text-white/50 text-xs font-semibold">TOTAL</span>
                    <span className="text-[#f4991a] font-bold text-base">KES {total.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pb-6">
            <Link href="/seller/orders" className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all">
              <ArrowLeft size={15} /> Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-70 bg-[#f4991a] hover:bg-[#f8b44a] hover:scale-105 shadow-lg shadow-orange-200/60"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Save size={15} /> Save Order</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
