'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/dashboard/Header'
import { ExpeditionOrigin } from '@/lib/types'
import {
  Search, ArrowLeft, Save, Globe, Hash,
  DollarSign, FileText, ChevronDown
} from 'lucide-react'
import Link from 'next/link'

const origins: { value: ExpeditionOrigin; flag: string }[] = [
  { value: 'China',  flag: '🇨🇳' },
  { value: 'Dubai',  flag: '🇦🇪' },
  { value: 'Turkey', flag: '🇹🇷' },
  { value: 'India',  flag: '🇮🇳' },
  { value: 'Local',  flag: '🇰🇪' },
]

export default function NewSourcingPage() {
  const router = useRouter()
  const [origin, setOrigin] = useState<ExpeditionOrigin>('China')
  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  const totalTarget = quantity && targetPrice
    ? (parseFloat(quantity) * parseFloat(targetPrice)).toLocaleString()
    : null

  const handleSave = () => {
    if (!productName || !quantity || !targetPrice) return
    setSaved(true)
    setTimeout(() => router.push('/dashboard/sourcings'), 1000)
  }

  return (
    <div className="min-h-screen">
      <Header title="New Sourcing" subtitle="Request a product sourcing" />

      <div className="px-6 pt-5 pb-10 max-w-2xl space-y-5">
        {/* Back */}
        <Link href="/dashboard/sourcings" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#1a1c3a] transition-colors">
          <ArrowLeft size={15} />
          Back to Sourcings
        </Link>

        {/* Origin */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Globe size={13} /> Sourcing Origin
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

        {/* Product Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <Search size={13} /> Product Details
          </h3>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Product Name *</label>
            <input
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="e.g. Bluetooth Speaker Mini"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description / Specifications</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the product specifications: size, color, material, features..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all resize-none"
            />
          </div>
        </div>

        {/* Quantity & Price */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <DollarSign size={13} /> Quantity & Budget
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantity *</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="100"
                min="1"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Unit Price (KES) *</label>
              <input
                type="number"
                value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all"
              />
            </div>
          </div>

          {totalTarget && (
            <div className="flex items-center justify-between p-3.5 bg-[#1a1c3a]/5 rounded-xl border border-[#1a1c3a]/10">
              <span className="text-xs font-semibold text-gray-600">Total Budget Estimate</span>
              <span className="text-sm font-bold text-[#1a1c3a]">KES {totalTarget}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <FileText size={13} /> Notes
          </h3>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any additional notes for the sourcing team..."
            rows={3}
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] transition-all resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!productName || !quantity || !targetPrice || saved}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1a1c3a] hover:bg-[#252750] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold py-3.5 rounded-xl transition-all"
          >
            <Save size={15} />
            {saved ? 'Saved!' : 'Submit Sourcing Request'}
          </button>
          <Link
            href="/dashboard/sourcings"
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
