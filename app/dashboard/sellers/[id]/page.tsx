'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import { supabase } from '@/lib/supabase'
import { fmtUsd, fmtKes, toKes } from '@/lib/currency'
import {
  ArrowLeft, Store, Mail, Phone, MapPin, Save, Wallet, Package, FileText, CheckCircle,
} from 'lucide-react'

interface SellerRow {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  city: string | null
  status: string
  notes: string | null
  created_at: string
  confirmation_fee_usd: number
  upsell_fee_usd: number
  cross_sell_fee_usd: number
  shipping_fee_usd: number
}

export default function SellerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [seller, setSeller] = useState<SellerRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fees, setFees] = useState({
    confirmation_fee_usd: 0,
    upsell_fee_usd: 0,
    cross_sell_fee_usd: 0,
    shipping_fee_usd: 0,
  })
  const [wallet, setWallet] = useState<{ balance: number; transferred: number }>({ balance: 0, transferred: 0 })
  const [stats, setStats] = useState({ orders: 0, invoices: 0 })

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      const { data: s } = await supabase.from('sellers').select('*').eq('id', id).single()
      if (s) {
        setSeller(s as SellerRow)
        setFees({
          confirmation_fee_usd: Number(s.confirmation_fee_usd || 0),
          upsell_fee_usd: Number(s.upsell_fee_usd || 0),
          cross_sell_fee_usd: Number(s.cross_sell_fee_usd || 0),
          shipping_fee_usd: Number(s.shipping_fee_usd || 0),
        })
      }
      const [{ data: w }, { data: tx }, { count: oc }, { count: ic }] = await Promise.all([
        supabase.from('seller_wallets').select('balance_usd').eq('seller_id', id).maybeSingle(),
        supabase.from('wallet_transactions').select('amount_usd,type').eq('seller_id', id).eq('type', 'withdraw'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', id),
        supabase.from('seller_invoices').select('id', { count: 'exact', head: true }).eq('seller_id', id),
      ])
      const transferred = (tx ?? []).reduce((s, r: any) => s + Math.abs(Number(r.amount_usd || 0)), 0)
      setWallet({ balance: Number(w?.balance_usd || 0), transferred })
      setStats({ orders: oc || 0, invoices: ic || 0 })
      setLoading(false)
    })()
  }, [id])

  const saveFees = async () => {
    setSaving(true)
    await supabase.from('sellers').update(fees).eq('id', id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Seller" />
        <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="min-h-screen">
        <Header title="Seller not found" />
        <div className="p-10 text-center text-gray-400 text-sm">This seller does not exist.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header title={seller.company || seller.name} subtitle="Seller profile · read-only view" />

      <div className="p-6 space-y-6 max-w-5xl">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#1a1c3a]">
          <ArrowLeft size={14} /> Back to sellers
        </button>

        {/* Profile card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-blue-100 flex items-center justify-center text-2xl font-bold text-[#1a1c3a]">
            {(seller.company || seller.name)[0]}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#1a1c3a]">{seller.company || seller.name}</h2>
            <p className="text-sm text-gray-500">{seller.name}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Mail size={11} /> {seller.email}</span>
              {seller.phone && <span className="flex items-center gap-1"><Phone size={11} /> {seller.phone}</span>}
              {seller.city && <span className="flex items-center gap-1"><MapPin size={11} /> {seller.city}</span>}
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-600 capitalize">{seller.status}</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <Wallet size={18} className="text-emerald-600 mb-3" />
            <div className="text-xl font-bold text-[#1a1c3a]">{fmtUsd(wallet.balance)}</div>
            <div className="text-[11px] text-gray-400">{fmtKes(toKes(wallet.balance))}</div>
            <div className="text-xs text-gray-500 mt-1">Wallet balance</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <Wallet size={18} className="text-blue-600 mb-3" />
            <div className="text-xl font-bold text-[#1a1c3a]">{fmtUsd(wallet.transferred)}</div>
            <div className="text-[11px] text-gray-400">{fmtKes(toKes(wallet.transferred))}</div>
            <div className="text-xs text-gray-500 mt-1">Transferred (all-time)</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <Package size={18} className="text-[#f4991a] mb-3" />
            <div className="text-3xl font-bold text-[#1a1c3a]">{stats.orders}</div>
            <div className="text-xs text-gray-500 mt-1">Total orders</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <FileText size={18} className="text-purple-600 mb-3" />
            <div className="text-3xl font-bold text-[#1a1c3a]">{stats.invoices}</div>
            <div className="text-xs text-gray-500 mt-1">Invoices</div>
          </div>
        </div>

        {/* Fees editor */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1a1c3a]">Service fees (USD)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Adjust per-seller Shipedo fees. Applied on next billing run.</p>
            </div>
            {saved && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle size={13} /> Saved</span>}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { key: 'confirmation_fee_usd', label: 'Confirmation' },
              { key: 'shipping_fee_usd',     label: 'Shipping (delivery)' },
              { key: 'upsell_fee_usd',       label: 'Upsell' },
              { key: 'cross_sell_fee_usd',   label: 'Cross-sell' },
            ] as const).map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{f.label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">$</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={fees[f.key]}
                    onChange={e => setFees(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={saveFees}
            disabled={saving}
            className="mt-5 flex items-center gap-2 bg-[#1a1c3a] hover:bg-[#252750] disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-xl"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
            Save fees
          </button>
        </div>

        {seller.notes && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h3 className="font-bold text-[#1a1c3a] mb-2">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{seller.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
