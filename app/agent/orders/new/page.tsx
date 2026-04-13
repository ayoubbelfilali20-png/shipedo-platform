'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Save, CheckCircle, Plus, Trash2, ChevronDown,
  Package, Search, X, User, ShoppingCart, Store, Copy, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const cities = ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Malindi','Kitale','Garissa','Nyeri']

type Seller = { id: string; name: string; company: string; email: string }
type Product = { id: string; name: string; sku: string; selling_price: number; stock: number; image_url?: string | null }

interface ProductRow {
  id: string
  productId: string
  name: string
  sku: string
  quantity: number
  unitPrice: number
}

function generateOrderId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = 'ORD-'
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

export default function AgentNewOrderPage() {
  const router = useRouter()

  // Seller selection
  const [sellers, setSellers] = useState<Seller[]>([])
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null)
  const [sellerSearch, setSellerSearch] = useState('')

  // Seller products
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductPicker, setShowProductPicker] = useState(false)

  // Order rows
  const [rows, setRows] = useState<ProductRow[]>([])

  // Customer fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('pending')

  // State
  const [saving, setSaving] = useState(false)
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load sellers
  useEffect(() => {
    supabase.from('sellers').select('id, name, company, email').eq('status', 'active')
      .then(({ data }) => setSellers((data || []) as Seller[]))
  }, [])

  // Load products when seller changes
  useEffect(() => {
    if (!selectedSeller) { setProducts([]); return }
    supabase.from('products').select('id, name, sku, selling_price, stock, image_url')
      .eq('seller_id', selectedSeller.id)
      .eq('status', 'active')
      .then(({ data }) => setProducts((data || []) as Product[]))
  }, [selectedSeller?.id])

  const total = rows.reduce((a, r) => a + r.unitPrice * r.quantity, 0)

  const addProduct = (p: Product) => {
    if (rows.some(r => r.productId === p.id)) return // no duplicate
    setRows(prev => [...prev, {
      id: `${Date.now()}`,
      productId: p.id,
      name: p.name,
      sku: p.sku,
      quantity: 1,
      unitPrice: p.selling_price || 0,
    }])
    setShowProductPicker(false)
    setProductSearch('')
  }

  const removeRow = (id: string) => setRows(r => r.filter(x => x.id !== id))
  const updateQty = (id: string, delta: number) => {
    setRows(r => r.map(x => x.id === id ? { ...x, quantity: Math.max(1, x.quantity + delta) } : x))
  }
  const updatePrice = (id: string, val: string) => {
    const num = parseFloat(val) || 0
    setRows(r => r.map(x => x.id === id ? { ...x, unitPrice: num } : x))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!selectedSeller) e.seller = 'Select a seller'
    if (!fullName.trim()) e.fullName = 'Required'
    if (!phone.trim()) e.phone = 'Required'
    if (rows.length === 0) e.products = 'Add at least one product'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)

    const newId = generateOrderId()
    const items = rows.map(r => ({
      product_id: r.productId, name: r.name, sku: r.sku,
      quantity: r.quantity, unit_price: r.unitPrice,
    }))

    // Round-robin assign agent
    let assignedAgentId: string | null = null
    try {
      const u = localStorage.getItem('shipedo_agent')
      if (u) {
        const parsed = JSON.parse(u)
        if (parsed.role === 'agent') assignedAgentId = parsed.id
      }
    } catch {}

    const { error } = await supabase.from('orders').insert({
      tracking_number: newId,
      seller_id: selectedSeller!.id,
      seller_name: selectedSeller!.company || selectedSeller!.name,
      assigned_agent_id: assignedAgentId,
      customer_name: fullName,
      customer_phone: phone,
      customer_city: city,
      customer_address: address,
      country: 'Kenya',
      notes: notes || null,
      items,
      total_amount: total,
      status,
      payment_method: 'COD',
    })

    setSaving(false)
    if (error) {
      alert('Error: ' + error.message)
      return
    }
    setGeneratedId(newId)
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
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <h1 className="font-bold text-[#1a1c3a] text-lg">New Order</h1>
        </div>
        <div className="p-6 max-w-md">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1a1c3a]">Order Created!</h2>
              <p className="text-sm text-gray-400 mt-1">Order has been added to {selectedSeller?.company || selectedSeller?.name}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 mb-2">Order ID</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-bold text-[#1a1c3a] font-mono tracking-wider">{generatedId}</span>
                <button onClick={copyId} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#f4991a]">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-left">
              <p className="text-xs font-semibold text-[#f4991a]">{fullName}</p>
              <p className="text-xs text-gray-500">{city || 'Kenya'} &middot; {rows.length} product(s) &middot; KES {total.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">Status: {status}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setGeneratedId(null); setFullName(''); setPhone(''); setCity(''); setAddress(''); setNotes(''); setRows([]); setStatus('pending'); setErrors({}) }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                New Order
              </button>
              <button
                onClick={() => router.push('/agent/calls')}
                className="flex-1 py-3 rounded-xl bg-[#f4991a] hover:bg-orange-500 text-white text-sm font-semibold"
              >
                Back to Calls
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Filter sellers
  const filteredSellers = sellers.filter(s => {
    const q = sellerSearch.toLowerCase()
    return !q || s.name?.toLowerCase().includes(q) || s.company?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
  })

  // Filter products
  const filteredProducts = products.filter(p => {
    const q = productSearch.toLowerCase()
    return !q || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/agent/calls')} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-bold text-[#1a1c3a] text-lg">New Order</h1>
          <p className="text-xs text-gray-400">Create order from call or WhatsApp</p>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-4xl">
        {/* Step 1: Select Seller */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-[#1a1c3a] text-base mb-4 flex items-center gap-2">
            <Store size={16} /> 1. Select Seller
          </h2>
          {errors.seller && <p className="text-xs text-red-500 mb-2">{errors.seller}</p>}

          {selectedSeller ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div>
                <p className="text-sm font-bold text-[#1a1c3a]">{selectedSeller.company || selectedSeller.name}</p>
                <p className="text-xs text-gray-500">{selectedSeller.email}</p>
              </div>
              <button onClick={() => { setSelectedSeller(null); setRows([]); setProducts([]) }} className="text-xs font-bold text-red-500 hover:text-red-700">
                Change
              </button>
            </div>
          ) : (
            <div>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={sellerSearch}
                  onChange={e => setSellerSearch(e.target.value)}
                  placeholder="Search seller by name, company, email..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                />
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {filteredSellers.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSeller(s); setSellerSearch(''); setErrors(e => ({ ...e, seller: '' })) }}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-orange-50 border border-gray-100 hover:border-[#f4991a]/30 rounded-xl text-left transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-xs font-bold text-[#1a1c3a] flex-shrink-0">
                      {(s.company || s.name || '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1a1c3a] truncate">{s.company || s.name}</p>
                      <p className="text-[10px] text-gray-400">{s.email}</p>
                    </div>
                  </button>
                ))}
                {filteredSellers.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No sellers found</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Customer Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-[#1a1c3a] text-base mb-4 flex items-center gap-2">
            <User size={16} /> 2. Customer Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name *</label>
              <input value={fullName} onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })) }}
                className={cn("w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]", errors.fullName ? 'border-red-300' : 'border-gray-200')} />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone *</label>
              <input value={phone} onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })) }}
                className={cn("w-full px-4 py-3 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]", errors.phone ? 'border-red-300' : 'border-gray-200')} />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">City</label>
              <select value={city} onChange={e => setCity(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]">
                <option value="">Select city</option>
                {cities.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Order Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Call/WhatsApp source, etc."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]" />
            </div>
          </div>
        </div>

        {/* Step 3: Products */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#1a1c3a] text-base flex items-center gap-2">
              <Package size={16} /> 3. Products
              {rows.length > 0 && <span className="text-xs bg-orange-50 text-[#f4991a] font-bold px-2 py-0.5 rounded-full">{rows.length}</span>}
            </h2>
            {selectedSeller && (
              <button
                onClick={() => setShowProductPicker(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-all"
              >
                <Plus size={13} /> Add Product
              </button>
            )}
          </div>

          {errors.products && <p className="text-xs text-red-500 mb-3">{errors.products}</p>}

          {!selectedSeller ? (
            <p className="text-xs text-gray-400 text-center py-8">Select a seller first to see their products</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No products added yet. Click "Add Product" above.</p>
          ) : (
            <div className="space-y-2">
              {rows.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package size={14} className="text-[#f4991a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1a1c3a] truncate">{r.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{r.sku}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(r.id, -1)} className="w-6 h-6 rounded bg-[#f4991a] text-white flex items-center justify-center text-xs font-bold">-</button>
                    <span className="text-xs font-bold text-[#1a1c3a] min-w-[20px] text-center">{r.quantity}</span>
                    <button onClick={() => updateQty(r.id, 1)} className="w-6 h-6 rounded bg-[#f4991a] text-white flex items-center justify-center text-xs font-bold">+</button>
                  </div>
                  <div className="flex items-center gap-1 min-w-[100px]">
                    <span className="text-[10px] text-gray-400">KES</span>
                    <input
                      type="number"
                      value={r.unitPrice || ''}
                      onChange={e => updatePrice(r.id, e.target.value)}
                      className="w-16 px-1.5 py-1 border border-gray-200 rounded-lg text-xs font-bold text-[#f4991a] text-right focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                      min={0}
                    />
                  </div>
                  <button onClick={() => removeRow(r.id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t border-gray-100">
                <span className="text-sm font-bold text-[#1a1c3a]">Total: <span className="text-[#f4991a]">KES {total.toLocaleString()}</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-[#f4991a] hover:bg-orange-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-200/60 disabled:opacity-60 transition-all"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={15} /> Create Order</>}
          </button>
        </div>
      </div>

      {/* Product Picker Modal */}
      {showProductPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#1a1c3a]">Select Product</h3>
              <button onClick={() => { setShowProductPicker(false); setProductSearch('') }} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <X size={15} className="text-gray-500" />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-gray-50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {filteredProducts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">No products found</p>
              ) : filteredProducts.map(p => {
                const alreadyAdded = rows.some(r => r.productId === p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => !alreadyAdded && addProduct(p)}
                    disabled={alreadyAdded}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 border rounded-xl text-left transition-all',
                      alreadyAdded
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-[#f4991a]/60 hover:bg-orange-50/30'
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-50 to-blue-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={16} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1a1c3a] truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{p.sku} &middot; Stock: {p.stock}</p>
                    </div>
                    <span className="text-xs font-bold text-[#f4991a]">KES {(p.selling_price || 0).toLocaleString()}</span>
                    {alreadyAdded && <span className="text-[9px] text-emerald-600 font-bold">Added</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
