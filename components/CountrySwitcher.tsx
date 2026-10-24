'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import { useCountry } from '@/lib/CountryContext'
import { COUNTRIES, type CountryCode } from '@/lib/countries'

const options: { code: CountryCode | 'ALL'; label: string; flag: string }[] = [
  { code: 'KE', label: 'Kenya', flag: '🇰🇪' },
  { code: 'TZ', label: 'Tanzania', flag: '🇹🇿' },
  { code: 'ALL', label: 'All Countries', flag: '🌍' },
]

export default function CountrySwitcher() {
  const { country, setCountry, isAdmin } = useCountry()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const current = options.find(o => o.code === country) || options[0]
  const showAll = isAdmin

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
      >
        <span className="text-lg leading-none">{current.flag}</span>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[11px] font-bold text-[#1a1c3a]">{current.label}</span>
          {country !== 'ALL' && (
            <span className="text-[9px] font-semibold text-gray-400 mt-0.5">
              {COUNTRIES[country as CountryCode]?.currency || ''}
            </span>
          )}
        </div>
        <ChevronDown size={12} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden p-1.5">
          {options
            .filter(o => o.code !== 'ALL' || showAll)
            .map(o => (
              <button
                key={o.code}
                onClick={() => { setCountry(o.code); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition-all ${
                  country === o.code
                    ? 'bg-orange-50 text-[#f4991a] font-bold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg leading-none">{o.flag}</span>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-semibold">{o.label}</span>
                  {o.code !== 'ALL' && (
                    <span className="text-[10px] text-gray-400">{COUNTRIES[o.code]?.currency}</span>
                  )}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
