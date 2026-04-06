'use client'

import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import { mockSellers } from '@/lib/data'
import { Seller, SellerStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Store, Plus, Search, X, Eye, EyeOff, Copy, Check,
  CheckCircle, Clock, XCircle, TrendingUp, Users,
  Phone, Mail, MapPin, Package, Wallet, RefreshCw,
  ChevronDown, Trash2, ShieldOff, ShieldCheck
} from 'lucide-react'

const statusConfig: Record<SellerStatus, { label: string; color: string; bg: string; border: string; dot: string; icon: React.ElementType }> = {
  active:    { label: 'Active',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
  pending:   { label: 'Pending',   color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-200',  dot: 'bg-yellow-500',  icon: Clock       },
  suspended: { label: 'Suspended', color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-500',     icon: XCircle     },
}

const cities = ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Malindi','Kitale','Garissa','Kakamega','Nyeri','Machakos','Meru','Kericho']

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function StatusBadge({ status }: { status: SellerStatus }) {
  const s = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border', s.color, s.bg, s.border)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
      {s.label}
    </span>
  )
}

const statusFilters: { value: SellerStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'active',    label: 'Active'    },
  { value: 'pending',   label: 'Pending'   },
  { value: 'suspended', label: 'Suspended' },
]

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>(mockSellers)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SellerStatus | 'all'>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [savedSeller, setSavedSeller] = useState<Seller | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    storeName: '', name: '', email: '', phone: '+254',
    city: '', password: genPassword(), notes: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)

  const filtered = sellers.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = s.storeName.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.phone.includes(q)
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total:     sellers.length,
    active:    sellers.filter(s => s.status === 'active').length,
    pending:   sellers.filter(s => s.status === 'pending').length,
    suspended: sellers.filter(s => s.status === 'suspended').length,
  }

  const handleSave = async () => {
    if (!form.storeName || !form.name || !form.email || !form.password) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    const newSeller: Seller = {
      id: `sel-${Date.now()}`,
      storeName: form.storeName,
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      city: form.city,
      totalOrders: 0,
      totalRevenue: 0,
      pendingPayout: 0,
      status: 'pending',
      role: 'seller',
      notes: form.notes || undefined,
      createdAt: new Date().toISOString(),
    }
    setSellers(prev => [newSeller, ...prev])
    setSavedSeller(newSeller)
    setSaving(false)
    setDrawerOpen(false)
    setForm({ storeName: '', name: '', email: '', phone: '+254', city: '', password: genPassword(), notes: '' })
  }

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(key)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const toggleStatus = (id: string) => {
    setSellers(prev => prev.map(s => {
      if (s.id !== id) return s
      const next: SellerStatus = s.status === 'active' ? 'suspended' : 'active'
      return { ...s, status: next }
    }))
  }

  const removeSeller = (id: string) => {
    setSellers(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Sellers"
        subtitle={`${stats.total} registered sellers`}
      />

      <div className="px-6 pt-5 pb-10 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Sellers', value: stats.total,     icon: Store,       color: 'text-[#1a1c3a]',   bg: 'bg-white'        },
            { label: 'Active',        value: stats.active,    icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50'   },
            { label: 'Pending',       value: stats.pending,   icon: Clock,       color: 'text-yellow-600',  bg: 'bg-yellow-50'    },
            { label: 'Suspended',     value: stats.suspended, icon: XCircle,     color: 'text-red-500',     bg: 'bg-red-50'       },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3`}>
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1a1c3a]">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filter + add */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sellers..."
              className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {statusFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === f.value ? 'bg-[#1a1c3a] text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-[#f4991a] hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex-shrink-0"
          >
            <Plus size={13} />
            Add Seller
          </button>
        </div>

        {/* Credentials success banner */}
        {savedSeller && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-emerald-700">Seller account created — share credentials</p>
              </div>
              <button onClick={() => setSavedSeller(null)} className="text-emerald-400 hover:text-emerald-600">
                <X size={15} />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: 'Email',    value: savedSeller.email,    key: 'email' },
                { label: 'Password', value: savedSeller.password, key: 'pass'  },
                { label: 'Login URL',value: 'shipedo.com/login',  key: 'url'   },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-emerald-100">
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">{item.label}</p>
                    <p className="text-xs font-mono font-bold text-[#1a1c3a]">{item.value}</p>
                  </div>
                  <button onClick={() => copyText(item.value, item.key)} className="text-gray-300 hover:text-emerald-600 transition-colors ml-2">
                    {copiedField === item.key ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sellers table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  {['Store', 'Contact', 'City', 'Orders', 'Revenue', 'Payout', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className={cn(
                      'text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3.5 first:px-6',
                      ['City', 'Revenue', 'Joined'].includes(h) && 'hidden lg:table-cell',
                      h === 'Payout' && 'hidden md:table-cell',
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-gray-400">
                      <Store size={36} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No sellers found</p>
                    </td>
                  </tr>
                ) : filtered.map(seller => (
                  <tr key={seller.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-sm font-bold text-[#1a1c3a] flex-shrink-0">
                          {seller.storeName[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#1a1c3a]">{seller.storeName}</p>
                          <p className="text-xs text-gray-400">{seller.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <a href={`mailto:${seller.email}`} className="flex items-center gap-1 text-xs text-gray-600 hover:text-[#f4991a] transition-colors">
                          <Mail size={11} className="text-gray-400" /> {seller.email}
                        </a>
                        <a href={`tel:${seller.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#f4991a] transition-colors">
                          <Phone size={11} className="text-gray-400" /> {seller.phone}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <MapPin size={11} className="text-gray-400" /> {seller.city}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-xs font-semibold text-[#1a1c3a]">
                        <Package size={12} className="text-gray-400" /> {seller.totalOrders}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-xs font-bold text-[#1a1c3a]">KES {seller.totalRevenue.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className={`text-xs font-bold ${seller.pendingPayout > 0 ? 'text-[#f4991a]' : 'text-gray-300'}`}>
                        KES {seller.pendingPayout.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={seller.status} />
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-xs text-gray-400">{formatDate(seller.createdAt)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleStatus(seller.id)}
                          title={seller.status === 'active' ? 'Suspend' : 'Activate'}
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center transition-all text-xs',
                            seller.status === 'active'
                              ? 'bg-red-50 text-red-400 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'
                          )}
                        >
                          {seller.status === 'active' ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                        </button>
                        <button
                          onClick={() => removeSeller(seller.id)}
                          title="Delete seller"
                          className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Add Seller Drawer ── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-[#1a1c3a]">Add New Seller</h2>
                <p className="text-xs text-gray-400 mt-0.5">Create a seller account with login access</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
                <X size={15} className="text-gray-500" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Store info */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Store Name *</label>
                <div className="relative">
                  <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    value={form.storeName}
                    onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))}
                    placeholder="e.g. TechHub Kenya"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Seller's full name"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email (login) *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="seller@store.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+254700000000"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
                <div className="relative">
                  <select
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full appearance-none px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                  >
                    <option value="">Select city</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, password: genPassword() }))}
                    title="Generate new password"
                    className="w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-100 transition-all flex-shrink-0"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Internal notes about this seller..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all resize-none"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-600 leading-relaxed">
                The seller will receive a <strong>Pending</strong> status until you manually activate their account. Their login will be the email + password above.
              </div>
            </div>

            {/* Drawer footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleSave}
                disabled={!form.storeName || !form.name || !form.email || !form.password || saving}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1a1c3a] hover:bg-[#252750] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl transition-all"
              >
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Plus size={15} /> Create Account</>
                }
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-5 py-3 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
