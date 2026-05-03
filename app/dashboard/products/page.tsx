'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { ProductStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import {
  Search, Plus, Package, ShoppingBag, TrendingUp,
  AlertTriangle, XCircle, Eye, X, Filter, Pencil, Check,
} from 'lucide-react'
import Link from 'next/link'

const statusConfig: Record<ProductStatus, { label: string; color: string; bg: string; dot: string }> = {
  active:       { label: 'Active',       color: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-500' },
  low_stock:    { label: 'Low Stock',    color: 'text-yellow-700',  bg: 'bg-yellow-50',   dot: 'bg-yellow-500'  },
  out_of_stock: { label: 'Out of Stock', color: 'text-red-600',     bg: 'bg-red-50',      dot: 'bg-red-500'     },
  inactive:     { label: 'Inactive',     color: 'text-gray-500',    bg: 'bg-gray-100',    dot: 'bg-gray-400'    },
}

const originFlag: Record<string, string> = {
  China: '🇨🇳', Dubai: '🇦🇪', Turkey: '🇹🇷', India: '🇮🇳', Local: '🇰🇪',
}

const statusFilters: { value: ProductStatus | 'all'; label: string }[] = [
  { value: 'all',          label: 'All'          },
  { value: 'active',       label: 'Active'       },
  { value: 'low_stock',    label: 'Low Stock'    },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'inactive',     label: 'Inactive'     },
]

function StatusBadge({ status }: { status: ProductStatus }) {
  const s = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.color} ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export default function ProductsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all')
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [editQty, setEditQty] = useState({ stock: 0, total_quantity: 0, defective_quantity: 0 })
  const [savingQty, setSavingQty] = useState(false)

  useEffect(() => {
    supabase.from('products').select('id, name, sku, selling_price, stock, total_quantity, defective_quantity, status, image_url, seller_id, created_at').order('created_at', { ascending: false }).limit(500).then(({ data, error }) => {
      if (error) alert('LOAD products error: ' + error.message + ' / code ' + error.code)
      else if (!data || data.length === 0) console.log('Products query returned empty')
      else console.log('Loaded products:', data.length, data)
      setProducts(data || [])
      setLoading(false)
    })
  }, [])

  const startEditQty = (p: any) => {
    setEditProduct(p)
    setEditQty({
      stock: p.stock || 0,
      total_quantity: p.total_quantity || p.stock || 0,
      defective_quantity: p.defective_quantity || 0,
    })
  }

  const saveQty = async () => {
    if (!editProduct) return
    setSavingQty(true)
    const patch = {
      stock: Number(editQty.stock) || 0,
      total_quantity: Number(editQty.total_quantity) || 0,
      defective_quantity: Number(editQty.defective_quantity) || 0,
    }
    const { error } = await supabase.from('products').update(patch).eq('id', editProduct.id)
    if (!error) {
      setProducts(prev => prev.map(p => p.id === editProduct.id ? { ...p, ...patch } : p))
    }
    setSavingQty(false)
    setEditProduct(null)
  }

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    lowStock: products.filter(p => p.status === 'low_stock').length,
    outOfStock: products.filter(p => p.status === 'out_of_stock').length,
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Products"
        subtitle={`${stats.total} products in stock`}
        action={{ label: 'New Product', href: '/dashboard/products/new' }}
      />

      <div className="px-6 pt-5 pb-6 space-y-4">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Products', value: stats.total,      icon: ShoppingBag,    color: 'text-[#1a1c3a]',   bg: 'bg-[#1a1c3a]/8'   },
            { label: 'Active',         value: stats.active,     icon: TrendingUp,     color: 'text-emerald-600', bg: 'bg-emerald-50'    },
            { label: 'Low Stock',      value: stats.lowStock,   icon: AlertTriangle,  color: 'text-yellow-600',  bg: 'bg-yellow-50'     },
            { label: 'Out of Stock',   value: stats.outOfStock, icon: XCircle,        color: 'text-red-500',     bg: 'bg-red-50'        },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1a1c3a]">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filter row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] shadow-sm transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {statusFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === f.value
                    ? 'bg-[#1a1c3a] text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Link
            href="/dashboard/products/new"
            className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex-shrink-0"
          >
            <Plus size={13} />
            New Product
          </Link>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 flex flex-col items-center text-gray-400">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-[#f4991a] rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading products...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 flex flex-col items-center text-gray-400">
            <Package size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(product => {
              const sellingPrice = product.selling_price || product.sellingPrice || 0
              const buyingPrice = product.buying_price || product.buyingPrice || 0
              const stockQty = product.stock || 0
              const margin = sellingPrice > 0 ? ((sellingPrice - buyingPrice) / sellingPrice * 100).toFixed(0) : '0'
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-50 to-blue-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-gray-400" />
                    </div>
                    <StatusBadge status={product.status as ProductStatus} />
                  </div>

                  {/* Info */}
                  <h3 className="font-bold text-[#1a1c3a] text-sm mb-0.5 truncate group-hover:text-[#f4991a] transition-colors">{product.name}</h3>
                  <p className="text-xs text-gray-400 mb-3">SKU: {product.sku} · {product.category}</p>

                  {/* Pricing */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400">Selling Price</p>
                      <p className="text-sm font-bold text-[#1a1c3a]">{sellingPrice.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Buying Price</p>
                      <p className="text-sm font-medium text-gray-500">{buyingPrice.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Margin</p>
                      <p className="text-sm font-bold text-emerald-600">{margin}%</p>
                    </div>
                  </div>

                  {/* Stock bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>Stock: <span className="font-semibold text-[#1a1c3a]">{stockQty}</span> units</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          product.status === 'out_of_stock' ? 'bg-red-400' :
                          product.status === 'low_stock'    ? 'bg-yellow-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min((stockQty / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      {originFlag[product.origin]} {product.origin}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{product.sellerName}</span>
                      <button
                        onClick={() => startEditQty(product)}
                        className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-all border border-blue-200"
                        title="Edit Quantity"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Quantity Modal (Admin only) */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Edit Quantity</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editProduct.name} · {editProduct.sellerName || 'Unknown seller'}</p>
              </div>
              <button onClick={() => setEditProduct(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Quantity in Stock</label>
                <input type="number" value={editQty.stock} onChange={e => setEditQty({ ...editQty, stock: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Total Quantity</label>
                <input type="number" value={editQty.total_quantity} onChange={e => setEditQty({ ...editQty, total_quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Quantity Defective</label>
                <input type="number" value={editQty.defective_quantity} onChange={e => setEditQty({ ...editQty, defective_quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button onClick={() => setEditProduct(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={saveQty} disabled={savingQty} className="flex-1 px-4 py-2.5 bg-[#f4991a] hover:bg-orange-500 text-white rounded-lg text-sm font-bold shadow-sm shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                {savingQty ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
